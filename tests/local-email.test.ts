import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createLocalWorkspace,
  recordIncoming,
  validateBackup,
  validateTemplateContent,
  type LocalCampaign,
  type LocalWorkspace,
} from "../src/lib/local-workspace";
import {
  createEmailThread,
  messagesForThread,
  saveThreadReply,
} from "../src/lib/local-email";
import { runCampaign } from "../src/lib/outreach";
function state() {
  const s = createLocalWorkspace();
  s.resources.push(
    {
      id: "mailbox-one",
      kind: "sender",
      name: "Sample sender one",
      data: { provider: "Gmail", address: "one@example.com" },
      updatedAt: new Date().toISOString(),
    },
    {
      id: "mailbox-two",
      kind: "sender",
      name: "Sample sender two",
      data: { provider: "Zoho", address: "two@example.com" },
      updatedAt: new Date().toISOString(),
    },
  );
  return s;
}
function emailCampaign(s: LocalWorkspace): LocalCampaign {
  return {
    id: "email-campaign",
    name: "Email preview",
    channel: "Email",
    senderId: "mailbox-one",
    templateId: "followup-email",
    agentId: "",
    contactIds: [s.contacts[0].id],
    status: "Draft",
    scheduledAt: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
test("email replies and incoming previews remain in their selected sender and subject thread", () => {
  let s = state();
  const a = createEmailThread(s, "1", "mailbox-one", "First topic");
  const b = createEmailThread(a.state, "1", "mailbox-two", "Second topic");
  s = b.state;
  s.threads = s.threads.map((t) =>
    t.id === a.threadId
      ? { ...t, draft: "First reply", status: "Open" }
      : t.id === b.threadId
        ? { ...t, status: "Closed" }
        : t,
  );
  s = saveThreadReply(s, a.threadId);
  s = recordIncoming(s, "1", "Email", "Incoming to second mailbox", b.threadId);
  const one = s.threads.find((t) => t.id === a.threadId)!,
    two = s.threads.find((t) => t.id === b.threadId)!;
  assert.deepEqual(
    messagesForThread(s, one).map((m) => m.body),
    ["First reply"],
  );
  assert.deepEqual(
    messagesForThread(s, two).map((m) => m.body),
    ["Incoming to second mailbox"],
  );
  assert.equal(messagesForThread(s, one)[0].subject, "Re: First topic");
  assert.equal(two.status, "Open");
  assert.doesNotThrow(() => validateBackup(s));
});
test("reopening one local email thread does not reopen other closed topics", () => {
  let s = state();
  const a = createEmailThread(s, "1", "mailbox-one", "Topic one"),
    b = createEmailThread(a.state, "1", "mailbox-one", "Topic two");
  s = {
    ...b.state,
    threads: b.state.threads.map((t) => ({ ...t, status: "Closed" })),
  };
  s = recordIncoming(s, "1", "Email", "Hello", a.threadId);
  assert.equal(s.threads.find((t) => t.id === a.threadId)?.status, "Open");
  assert.equal(s.threads.find((t) => t.id === b.threadId)?.status, "Closed");
});
test("legacy email sample history stays out of newly created conversations", () => {
  const s = state(),
    newThread = createEmailThread(s, "2", "", "New topic");
  const legacy = newThread.state.threads.find((t) => t.id === "thread-2")!,
    created = newThread.state.threads.find((t) => t.id === newThread.threadId)!;
  assert.equal(messagesForThread(newThread.state, legacy).length, 1);
  assert.equal(messagesForThread(newThread.state, created).length, 0);
});
test("campaign simulation preserves personalized rich content and sender independently of future template edits", () => {
  let s = state();
  const t = s.templates.find((t) => t.id === "followup-email")!;
  t.body = "Hi {{first_name}}";
  t.buttons = [
    {
      text: "Details for {{name}}",
      url: "https://example.com/{{first_name}}",
      kind: "URL",
    },
  ];
  t.cards = [
    {
      id: "card",
      title: "Hello {{first_name}}",
      body: "For {{company}}",
      mediaUrl: "https://example.com/offer.png",
      buttons: [{ text: "Interested", url: "", kind: "Quick reply" }],
    },
  ];
  const c = emailCampaign(s);
  s.campaigns = [c];
  s = runCampaign(s, c.id);
  const message = s.messages.find((m) => m.campaignId === c.id)!;
  assert.equal(message.senderId, "mailbox-one");
  assert.equal(message.template?.cards?.[0].title, "Hello Aarav");
  assert.equal(message.template?.buttons[0].url, "https://example.com/Aarav");
  s.templates.find((t) => t.id === c.templateId)!.cards![0].title =
    "Edited later";
  assert.equal(message.template?.cards?.[0].title, "Hello Aarav");
  assert.equal(
    s.threads.find((t) => t.id === message.threadId)?.mailboxId,
    "mailbox-one",
  );
  assert.doesNotThrow(() => validateBackup(JSON.parse(JSON.stringify(s))));
});
test("rich templates reject unsafe URLs and unsupported carousel variables before consuming credits", () => {
  const s = state(),
    t = s.templates[0];
  t.cards = [
    {
      id: "card",
      title: "Offer {{missing}}",
      body: "",
      mediaUrl: "javascript:alert(1)",
      buttons: [],
    },
  ];
  const errors = validateTemplateContent(t);
  assert.ok(errors.some((e) => e.includes("unsupported variables")));
  assert.ok(errors.some((e) => e.includes("URL")));
  s.campaigns = [
    {
      ...emailCampaign(s),
      channel: "WhatsApp",
      templateId: t.id,
      senderId: undefined,
    },
  ];
  assert.throws(() => runCampaign(s, s.campaigns[0].id));
  assert.equal(s.transactions.length, 1);
});
test("archived senders cannot start new conversations or campaign simulations", () => {
  const s = state();
  s.resources.find((r) => r.id === "mailbox-one")!.data.archived = "true";
  assert.throws(
    () => createEmailThread(s, "1", "mailbox-one", "Test"),
    /available sender/,
  );
  s.campaigns = [emailCampaign(s)];
  assert.throws(
    () => runCampaign(s, s.campaigns[0].id),
    /available local sender/,
  );
});
test("backup validation detects mismatched contact and mailbox conversation references", () => {
  const a = createEmailThread(state(), "1", "mailbox-one", "Topic");
  let s = a.state;
  s.threads.find((t) => t.id === a.threadId)!.draft = "Test reply";
  s = saveThreadReply(s, a.threadId);
  const bad = structuredClone(s);
  bad.messages.at(-1)!.senderId = "mailbox-two";
  assert.throws(() => validateBackup(bad), /conversation reference/);
  bad.messages.at(-1)!.senderId = "mailbox-one";
  bad.messages.at(-1)!.contactId = "2";
  assert.throws(() => validateBackup(bad), /conversation reference/);
  assert.throws(
    () => recordIncoming(s, "2", "Email", "Wrong thread", a.threadId),
    /does not match/,
  );
});
test("long campaign subjects can be replied to without losing their contents", () => {
  let s = state();
  s.templates.find((t) => t.id === "followup-email")!.subject = "S".repeat(200);
  const c = emailCampaign(s);
  s.campaigns = [c];
  s = runCampaign(s, c.id);
  const thread = s.threads.find((t) => t.campaignId === c.id)!;
  thread.draft = "Reply";
  s = saveThreadReply(s, thread.id);
  assert.equal(s.messages.at(-1)!.subject, "Re: " + "S".repeat(200));
  assert.doesNotThrow(() => validateBackup(s));
});
test("WhatsApp campaigns continue one conversation while email campaigns create separate topics", () => {
  let s = state();
  const a = {
    ...emailCampaign(s),
    id: "wa-one",
    channel: "WhatsApp" as const,
    templateId: "welcome-wa",
    senderId: undefined,
  };
  const b = { ...a, id: "wa-two" };
  s.campaigns = [a, b];
  s = runCampaign(s, a.id);
  s = runCampaign(s, b.id);
  const wa = s.threads.filter(
    (t) => t.channel === "WhatsApp" && t.contactId === "1",
  );
  assert.equal(wa.length, 1);
  assert.equal(
    messagesForThread(s, wa[0]).filter((m) => m.kind === "Simulation").length,
    2,
  );
});
