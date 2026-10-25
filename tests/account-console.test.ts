import test from "node:test";
import assert from "node:assert/strict";
import {
  createEmptyWorkspace,
  parseDocumentWrite,
  seedAccountRecords,
} from "../src/lib/workspace-document";
import {
  createLocalWorkspace,
  validateBackup,
} from "../src/lib/local-workspace";
import {
  createReminder,
  reminderTask,
  saveAvailability,
} from "../src/lib/booking";
import { audience, validateBooking } from "../src/lib/outreach";
import { groups, names } from "../src/components/console/navigation";

test("authenticated drafts contain no demo contacts, messages, identity or opening credit", () => {
  const workspace = createEmptyWorkspace("Acme");
  assert.equal(workspace.settings.name, "Acme");
  for (const key of [
    "contacts",
    "messages",
    "threads",
    "transactions",
    "team",
    "templates",
  ] as const)
    assert.deepEqual(workspace[key], []);
  assert.deepEqual(validateBackup(workspace), workspace);
  assert.equal(
    parseDocumentWrite({ revision: 2, state: workspace }).revision,
    2,
  );
  assert.throws(() => parseDocumentWrite({ revision: -1, state: workspace }));
  assert.throws(() =>
    parseDocumentWrite({
      revision: 1,
      state: workspace,
      workspaceId: "foreign",
    }),
  );
});
test("document writes reject invalid links and references before persistence", () => {
  const state = createLocalWorkspace();
  state.messages[0].threadId = "missing";
  assert.throws(
    () => parseDocumentWrite({ revision: 0, state }),
    /conversation/,
  );
});
test("every requested area has its own dropdown and route ids are unambiguous", () => {
  const required = [
    "Contacts",
    "Campaigns",
    "WhatsApp",
    "Inbox",
    "Automation",
    "Lead capture",
    "Email",
    "AI Calling",
    "Booking",
    "Reporting",
    "Billing",
    "Acquisition tools",
  ];
  for (const area of required)
    assert.ok(
      groups.some((g) => g.name === area && g.items.length > 1),
      area,
    );
  const ids = groups.flatMap((g) => g.items.map(([id]) => id));
  assert.equal(ids.length, new Set(ids).size);
  for (const id of ids) assert.ok(names[id]);
  assert.ok(!ids.some((id) => id.includes("pipeline")));
});
test("advanced segment filters combine owner, consent, address and creation date", () => {
  const state = createLocalWorkspace();
  state.contacts[0] = {
    ...state.contacts[0],
    owner: "One",
    createdAt: "2026-10-20T10:00:00Z",
  };
  state.contacts[1] = {
    ...state.contacts[1],
    owner: "Two",
    createdAt: "2026-10-01T10:00:00Z",
  };
  assert.deepEqual(
    audience(state, {
      owner: "One",
      consent: "Yes",
      address: "Email",
      createdAfter: "2026-10-19",
    }).map((c) => c.id),
    [state.contacts[0].id],
  );
  state.contacts[0].optedOut = true;
  assert.equal(audience(state, { owner: "One", consent: "Yes" }).length, 0);
  assert.equal(
    audience(state, { owner: "One", consent: "Opted out" }).length,
    1,
  );
});
test("availability validates hours and constrains bookings in the saved timezone", () => {
  let state = createEmptyWorkspace();
  assert.throws(() => saveAvailability(state, [], "09:00", "18:00"));
  assert.throws(() => saveAvailability(state, ["1"], "24:00", "25:00"));
  state = saveAvailability(state, ["1"], "09:00", "18:00");
  state.resources[0].data.timezone = "UTC";
  assert.doesNotThrow(() =>
    validateBooking(state.resources, {
      start: "2026-10-26T10:00:00Z",
      end: "2026-10-26T11:00:00Z",
    }),
  );
  assert.throws(
    () =>
      validateBooking(state.resources, {
        start: "2026-10-27T10:00:00Z",
        end: "2026-10-27T11:00:00Z",
      }),
    /availability/,
  );
  assert.throws(
    () =>
      validateBooking(state.resources, {
        start: "2026-10-26T17:30:00Z",
        end: "2026-10-26T18:30:00Z",
      }),
    /availability/,
  );
  assert.throws(
    () =>
      validateBooking(state.resources, {
        start: "2026-10-26T17:30:00Z",
        end: "2026-10-27T10:00:00Z",
      }),
    /availability/,
  );
});
test("reminder drafts create one review task and never send or debit", () => {
  let state = createEmptyWorkspace();
  state.resources.push({
    id: "booking",
    kind: "booking",
    name: "Demo",
    data: {
      status: "Confirmed",
      start: new Date(Date.now() + 3 * 86400000).toISOString(),
    },
    updatedAt: new Date().toISOString(),
  });
  state = createReminder(state, "booking", 60, "Email", "Please review");
  const reminder = state.resources.find((r) => r.kind === "reminder")!;
  assert.throws(
    () => createReminder(state, "booking", 60, "Email", "Duplicate"),
    /already/,
  );
  state = reminderTask(state, reminder.id);
  assert.equal(state.tasks.length, 1);
  assert.equal(state.tasks[0].dueAt, reminder.data.dueAt);
  assert.throws(() => reminderTask(state, reminder.id), /already/);
  assert.equal(state.messages.length, 0);
  assert.equal(state.transactions.length, 0);
  state.resources.find((r) => r.kind === "booking")!.data.status = "Cancelled";
  assert.throws(
    () => createReminder(state, "booking", 15, "Email", "No"),
    /active/,
  );
});

test("existing account records are copied without activating old schedules or inventing recipients", () => {
  const contacts = [
    {
      id: "one",
      name: "Customer",
      company: "Acme",
      email: "customer@example.com",
      consent: true,
      opted_out_at: "2026-10-01T00:00:00Z",
    },
  ];
  const campaigns = [
    {
      id: "planned",
      name: "Outreach",
      channel: "email",
      status: "running",
      scheduled_at: "2026-10-30T10:00:00Z",
    },
  ];
  const state = seedAccountRecords("Business", contacts, campaigns);
  assert.equal(state.contacts[0].optedOut, true);
  assert.equal(state.contacts[0].consent, true);
  assert.equal(state.campaigns[0].status, "Draft");
  assert.deepEqual(state.campaigns[0].contactIds, []);
  assert.equal(state.campaigns[0].scheduledAt, "");
  assert.equal(campaigns[0].status, "running");
  assert.deepEqual(state.messages, []);
  assert.equal(state.activities.length, 1);
});
