import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createLocalWorkspace,
  balance,
  eligibleContacts,
  recordIncoming,
  validateBackup,
  type LocalCampaign,
  type LocalSequence,
  type LocalWorkspace,
} from "../src/lib/local-workspace";
import {
  runCampaign,
  startSequence,
  advanceSequence,
  simulateCall,
  validateBooking,
  chatLink,
  audience,
  addActivity,
} from "../src/lib/outreach";
function workspace() {
  const s = createLocalWorkspace();
  s.contacts = s.contacts.slice(0, 2);
  return s;
}
function campaign(s: LocalWorkspace): LocalCampaign {
  return {
    id: "campaign-test",
    name: "Sample campaign",
    channel: "WhatsApp",
    templateId: s.templates[0].id,
    agentId: "",
    contactIds: s.contacts.map((c) => c.id),
    status: "Draft",
    scheduledAt: "",
    createdAt: "2020-01-01T00:00:00Z",
    updatedAt: "2020-01-01T00:00:00Z",
  };
}
function sequence(steps: LocalSequence["steps"]): LocalSequence {
  return {
    id: "sequence-test",
    name: "Sample sequence",
    description: "",
    updatedAt: new Date().toISOString(),
    steps,
  };
}
const step = (type: LocalSequence["steps"][number]["type"]) => ({
  id: crypto.randomUUID(),
  type,
  templateId: "welcome-wa",
  agentId: "",
  minutes: 1,
  condition: "Consent recorded" as const,
});
test("campaign simulation excludes suppression and records usage exactly once", () => {
  let s = workspace();
  const c = campaign(s);
  s.campaigns = [c];
  s.contacts[1].optedOut = true;
  const before = balance(s);
  s = runCampaign(s, c.id);
  assert.equal(before - balance(s), 1);
  assert.equal(s.messages.filter((m) => m.kind === "Simulation").length, 1);
  assert.equal(s.campaigns[0].status, "Completed");
  assert.throws(() => runCampaign(s, c.id), /cannot run again/);
});
test("paused campaign cannot consume sample credits", () => {
  const s = workspace(),
    c = campaign(s);
  c.status = "Paused";
  s.campaigns = [c];
  const before = balance(s);
  assert.throws(() => runCampaign(s, c.id), /Resume/);
  assert.equal(balance(s), before);
});
test("reply and handoff suppress already planned outreach", () => {
  let s = workspace();
  const c = campaign(s);
  s.campaigns = [c];
  s = recordIncoming(s, s.contacts[0].id, "WhatsApp", "Please stop");
  s = addActivity(s, s.contacts[1].id, "Human handoff", "handoff");
  assert.equal(eligibleContacts(s, c).length, 0);
  assert.throws(() => runCampaign(s, c.id), /eligible contact/);
});
test("sequence run holds a snapshot and stops on a reply between steps", () => {
  let s = workspace();
  const seq = sequence([step("WhatsApp"), step("Email")]);
  seq.steps[1].templateId = "followup-email";
  s.sequences = [seq];
  s = startSequence(s, seq, s.contacts[0].id);
  const id = s.sequenceRuns[0].id;
  seq.steps[0].templateId = "mutated-template";
  assert.equal(s.sequenceRuns[0].steps[0].templateId, "welcome-wa");
  s = advanceSequence(s, id);
  const cost = balance(s);
  s = recordIncoming(s, s.contacts[0].id, "WhatsApp", "Interested");
  s = advanceSequence(s, id);
  assert.equal(s.sequenceRuns[0].status, "Stopped");
  assert.equal(balance(s), cost);
});
test("sequence delay requires elapsed time or an explicit preview-clock action", () => {
  let s = workspace();
  const seq = sequence([step("Delay"), step("WhatsApp")]);
  s.sequences = [seq];
  s = startSequence(s, seq, s.contacts[0].id);
  const id = s.sequenceRuns[0].id;
  s = advanceSequence(s, id);
  assert.equal(s.sequenceRuns[0].status, "Waiting");
  assert.throws(() => advanceSequence(s, id), /Delay is still pending/);
  s = advanceSequence(s, id, true);
  assert.equal(s.sequenceRuns[0].cursor, 1);
  s = advanceSequence(s, id);
  assert.equal(s.sequenceRuns[0].status, "Completed");
});
test("a failed qualification condition stops without usage", () => {
  let s = workspace();
  s.contacts[0].stage = "New";
  const condition = {
    ...step("Condition"),
    condition: "Qualified lead" as const,
  };
  const seq = sequence([condition, step("WhatsApp")]);
  s.sequences = [seq];
  s = startSequence(s, seq, s.contacts[0].id);
  const before = balance(s);
  s = advanceSequence(s, s.sequenceRuns[0].id);
  assert.equal(s.sequenceRuns[0].status, "Stopped");
  assert.equal(balance(s), before);
});
test("sequence handoff creates a task and blocks pending campaigns", () => {
  let s = workspace();
  const c = campaign(s);
  s.campaigns = [c];
  const seq = sequence([step("Handoff"), step("WhatsApp")]);
  s.sequences = [seq];
  s = startSequence(s, seq, s.contacts[0].id);
  s = advanceSequence(s, s.sequenceRuns[0].id);
  assert.equal(s.tasks.length, 1);
  assert.equal(s.sequenceRuns[0].status, "Stopped");
  assert.equal(
    eligibleContacts(s, c).some((p) => p.id === s.contacts[0].id),
    false,
  );
});
test("call preview rounds started minutes and applies the selected qualification outcome", () => {
  let s = workspace();
  s.agents = [
    {
      id: "agent",
      name: "Preview agent",
      language: "English",
      voice: "",
      instructions: "Hello",
      knowledge: "",
      qualification: "",
      maxDuration: 120,
      concurrency: 1,
      handoff: "",
      updatedAt: new Date().toISOString(),
    },
  ];
  const before = balance(s);
  s = simulateCall(s, "agent", s.contacts[0].id, "Qualified", 61);
  assert.equal(before - balance(s), 10);
  assert.equal(s.calls.length, 1);
  assert.equal(s.contacts[0].stage, "Qualified");
  assert.throws(
    () => simulateCall(s, "agent", s.contacts[0].id, "Qualified", 121),
    /Duration/,
  );
  s.contacts[0].optedOut = true;
  assert.throws(
    () => simulateCall(s, "agent", s.contacts[0].id, "Qualified", 30),
    /opted out/,
  );
});
test("local appointments reject overlap and invalid times but permit adjacent slots", () => {
  const booking = {
    id: "one",
    kind: "booking" as const,
    name: "Sample",
    updatedAt: "",
    data: {
      start: "2026-11-01T10:00:00",
      end: "2026-11-01T11:00:00",
      status: "Confirmed",
    },
  };
  assert.throws(
    () =>
      validateBooking([booking], {
        start: "2026-11-01T10:30:00",
        end: "2026-11-01T11:30:00",
      }),
    /overlaps/,
  );
  assert.doesNotThrow(() =>
    validateBooking([booking], {
      start: "2026-11-01T11:00:00",
      end: "2026-11-01T12:00:00",
    }),
  );
  assert.throws(
    () => validateBooking([], { start: "bad", end: "bad" }),
    /end time/,
  );
});
test("audience rules combine tag, status and consent without mutating contacts", () => {
  const s = workspace();
  s.contacts[0].tags = ["Warm"];
  s.contacts[0].stage = "Qualified";
  s.contacts[1].tags = ["Warm"];
  s.contacts[1].optedOut = true;
  assert.deepEqual(
    audience(s, { tag: "Warm", stage: "Qualified", consent: "Yes" }).map(
      (c) => c.id,
    ),
    [s.contacts[0].id],
  );
});
test("backup validation rejects duplicate IDs, missing references and malformed windows", () => {
  const s = createLocalWorkspace();
  assert.doesNotThrow(() => validateBackup(s));
  const duplicate = structuredClone(s);
  duplicate.transactions.push({ ...duplicate.transactions[0] });
  assert.throws(() => validateBackup(duplicate), /Duplicate/);
  const missing = structuredClone(s);
  missing.tasks.push({
    id: "task",
    contactId: "absent",
    title: "Missing",
    done: false,
    dueAt: "",
  });
  assert.throws(() => validateBackup(missing), /missing contact/);
  const badWindows = structuredClone(s);
  badWindows.windows.WhatsApp[1].start = "99:00";
  assert.throws(() => validateBackup(badWindows), /Invalid sending/);
});
test("chat link normalizes international numbers and safely encodes the message", () => {
  assert.equal(
    chatLink("+91 98765 43210", "Hi & hello?"),
    "https://wa.me/919876543210?text=Hi%20%26%20hello%3F",
  );
  assert.throws(() => chatLink("123", "Hi"), /international number/);
});

test("rich template metadata and local attachments round-trip in backups", () => {
  const s = createLocalWorkspace();
  s.templates[0].mediaUrl = "https://example.com/sample.png";
  s.templates[0].buttons = [
    { text: "View details", url: "https://example.com" },
  ];
  s.threads[0].attachments = [
    {
      id: "attachment-test",
      name: "sample.txt",
      type: "text/plain",
      size: 3,
      dataUrl: "data:text/plain;base64,YWJj",
    },
  ];
  const restored = validateBackup(JSON.parse(JSON.stringify(s)));
  assert.equal(
    restored.threads[0].attachments?.[0].dataUrl,
    "data:text/plain;base64,YWJj",
  );
  assert.equal(restored.templates[0].buttons[0].text, "View details");
  const bad = JSON.parse(JSON.stringify(s));
  bad.threads[0].attachments[0].dataUrl = "javascript:alert(1)";
  assert.throws(() => validateBackup(bad));
});
test("unsupported email subject variables prevent simulation without spending", () => {
  const s = workspace();
  const c = campaign(s);
  c.channel = "Email";
  c.templateId = "followup-email";
  s.campaigns = [c];
  s.templates.find((t) => t.id === "followup-email")!.subject =
    "Hi {{unsupported}}";
  assert.throws(() => runCampaign(s, c.id), /unsupported variables/);
});
