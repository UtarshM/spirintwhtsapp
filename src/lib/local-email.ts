import { uid, now, type LocalWorkspace, type Channel } from "./local-workspace";
export type LocalThread = LocalWorkspace["threads"][number];
export function messagesForThread(state: LocalWorkspace, thread: LocalThread) {
  return state.messages.filter((message) => {
    if (message.threadId) return message.threadId === thread.id;
    if (
      message.channel !== thread.channel ||
      message.contactId !== thread.contactId
    )
      return false;
    if (thread.channel !== "Email")
      return (
        state.threads.find(
          (t) =>
            t.channel === thread.channel && t.contactId === thread.contactId,
        )?.id === thread.id
      );
    return (
      !thread.mailboxId &&
      !thread.subject &&
      state.threads.find(
        (t) =>
          t.channel === "Email" &&
          t.contactId === thread.contactId &&
          !t.mailboxId &&
          !t.subject,
      )?.id === thread.id
    );
  });
}
export function createEmailThread(
  state: LocalWorkspace,
  contactId: string,
  mailboxId: string,
  subject: string,
): { state: LocalWorkspace; threadId: string } {
  if (!state.contacts.some((c) => c.id === contactId && c.email))
    throw Error("Choose a contact with an email address.");
  if (!subject.trim() || subject.trim().length > 190)
    throw Error("Enter a subject up to 190 characters.");
  if (
    mailboxId &&
    !state.resources.some(
      (r) =>
        r.id === mailboxId && r.kind === "sender" && r.data.archived !== "true",
    )
  )
    throw Error("Choose an available sender draft.");
  const threadId = uid();
  return {
    state: {
      ...state,
      threads: [
        ...state.threads,
        {
          id: threadId,
          contactId,
          mailboxId,
          subject: subject.trim(),
          channel: "Email",
          status: "Open",
          assignee: state.team[0]?.name || "Unassigned",
          draft: "",
        },
      ],
    },
    threadId,
  };
}
export function saveThreadReply(
  state: LocalWorkspace,
  threadId: string,
): LocalWorkspace {
  const thread = state.threads.find((t) => t.id === threadId);
  if (!thread || thread.status === "Closed")
    throw Error("Open a conversation before saving a reply.");
  if (!thread.draft.trim() && !thread.attachments?.length)
    throw Error("Write a reply or attach a sample file.");
  const at = now(),
    subject = thread.subject
      ? thread.subject.toLowerCase().startsWith("re:")
        ? thread.subject
        : `Re: ${thread.subject}`
      : "";
  return {
    ...state,
    messages: [
      ...state.messages,
      {
        id: uid(),
        threadId,
        contactId: thread.contactId,
        channel: thread.channel,
        subject,
        senderId: thread.mailboxId,
        body: thread.draft.trim(),
        attachments: structuredClone(thread.attachments || []),
        kind: "Local draft",
        direction: "outbound",
        at,
      },
    ],
    threads: state.threads.map((t) =>
      t.id === threadId ? { ...t, draft: "", attachments: [] } : t,
    ),
    activities: [
      ...state.activities,
      {
        id: uid(),
        contactId: thread.contactId,
        campaignId: thread.campaignId || "",
        kind: "local_reply",
        description: "Reply saved locally; not sent",
        channel: thread.channel,
        at,
      },
    ],
  };
}
