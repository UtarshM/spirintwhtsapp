import {
  balance,
  eligibleContacts,
  now,
  uid,
  simulateCampaign,
  validateSequence,
  type LocalWorkspace,
  type LocalContact,
  type LocalSequence,
  type LocalCampaign,
} from "./local-workspace";
export type Resource = LocalWorkspace["resources"][number];
export const leadStatuses = [
  "New",
  "Contacted",
  "Replied",
  "Qualified",
  "Not interested",
];
export function audience(s: LocalWorkspace, data: Record<string, string>) {
  return s.contacts.filter(
    (c) =>
      (!data.query ||
        `${c.name} ${c.company} ${c.email}`
          .toLowerCase()
          .includes(data.query.toLowerCase())) &&
      (!data.tag || c.tags.includes(data.tag)) &&
      (!data.stage || c.stage === data.stage) &&
      (data.consent !== "Yes" || (c.consent && !c.optedOut)),
  );
}
export function addActivity(
  s: LocalWorkspace,
  contactId: string,
  description: string,
  kind: LocalWorkspace["activities"][number]["kind"] = "note",
): LocalWorkspace {
  return {
    ...s,
    activities: [
      ...s.activities,
      { id: uid(), contactId, campaignId: "", kind, description, at: now() },
    ],
  };
}
export function runCampaign(s: LocalWorkspace, id: string): LocalWorkspace {
  const c = s.campaigns.find((c) => c.id === id);
  if (!c) throw Error("Campaign not found");
  if (c.status === "Paused")
    throw Error("Resume this campaign before simulating.");
  const people = eligibleContacts(s, c);
  let next = simulateCampaign(s, id);
  if (c.channel === "AI calling") {
    const agent = s.agents.find((a) => a.id === c.agentId)!;
    next = {
      ...next,
      calls: [
        ...next.calls,
        ...people.map((p) => ({
          id: uid(),
          agentId: agent.id,
          contactId: p.id,
          at: now(),
          outcome: "Follow-up" as const,
          duration: 60,
          transcript: [
            {
              speaker: "Agent" as const,
              text: `Scripted simulation using ${agent.name}.`,
            },
            {
              speaker: "Contact" as const,
              text: "Sample response: please follow up.",
            },
          ],
        })),
      ],
    };
  }
  return next;
}
export function simulateCall(
  s: LocalWorkspace,
  agentId: string,
  contactId: string,
  outcome: LocalWorkspace["calls"][number]["outcome"],
  duration: number,
): LocalWorkspace {
  const agent = s.agents.find((a) => a.id === agentId),
    contact = s.contacts.find((c) => c.id === contactId);
  if (!agent || !contact) throw Error("Choose an agent and a contact");
  if (!contact.consent || contact.optedOut || !contact.phone)
    throw Error(
      "A contact needs consent and a phone number, and must not be opted out.",
    );
  if (
    !Number.isInteger(duration) ||
    duration < 1 ||
    duration > agent.maxDuration
  )
    throw Error(`Duration must be between 1 and ${agent.maxDuration} seconds.`);
  const cost = Math.ceil(duration / 60) * 5;
  if (balance(s) < cost) throw Error("Insufficient sample credits");
  const at = now();
  return {
    ...s,
    calls: [
      ...s.calls,
      {
        id: uid(),
        agentId,
        contactId,
        at,
        outcome,
        duration,
        transcript: [
          {
            speaker: "Agent",
            text: `Scripted preview: ${agent.instructions || "Hello, how can we help?"} `,
          },
          {
            speaker: "Contact",
            text: `Sample outcome selected by reviewer: ${outcome}.`,
          },
          {
            speaker: "Agent",
            text:
              outcome === "Qualified"
                ? "I’ll pass this conversation to the team."
                : "Thank you for your time.",
          },
        ],
      },
    ],
    contacts: s.contacts.map((c) =>
      c.id === contactId
        ? {
            ...c,
            stage:
              outcome === "Qualified"
                ? "Qualified"
                : outcome === "Not interested"
                  ? "Not interested"
                  : "Contacted",
          }
        : c,
    ),
    transactions: [
      ...s.transactions,
      {
        id: uid(),
        kind: "Simulation usage",
        credits: -cost,
        at,
        reference: `Scripted call preview · ${agent.name} · ${duration}s`,
      },
    ],
    activities: [
      ...s.activities,
      {
        id: uid(),
        contactId,
        campaignId: "",
        kind: "simulation",
        description: `Scripted call preview: ${outcome} · ${duration}s · ${cost} sample credits`,
        at,
        channel: "AI calling",
      },
    ],
  };
}
export function startSequence(
  s: LocalWorkspace,
  sequence: LocalSequence,
  contactId: string,
): LocalWorkspace {
  const errors = validateSequence(s, sequence);
  if (errors.length) throw Error(errors.join(" "));
  if (!s.contacts.some((c) => c.id === contactId))
    throw Error("Choose a contact");
  return {
    ...s,
    sequenceRuns: [
      ...s.sequenceRuns,
      {
        id: uid(),
        sequenceId: sequence.id,
        contactId,
        startedAt: now(),
        cursor: 0,
        status: "Running",
        nextAt: "",
        history: ["Local simulation started. No live outreach."],
        steps: structuredClone(sequence.steps),
      },
    ],
  };
}
export function advanceSequence(
  s: LocalWorkspace,
  id: string,
  advanceClock = false,
): LocalWorkspace {
  const run = s.sequenceRuns.find((r) => r.id === id);
  if (!run || ["Completed", "Stopped"].includes(run.status))
    throw Error("This run cannot advance");
  const c = s.contacts.find((c) => c.id === run.contactId);
  let next = s,
    cursor = run.cursor,
    status: typeof run.status = "Running",
    nextAt = "",
    description = "";
  const replied =
    s.settings.stopOnReply &&
    s.activities.some(
      (a) =>
        a.contactId === run.contactId &&
        (a.kind === "inbound_reply" || a.kind === "handoff") &&
        a.at >= run.startedAt,
    );
  if (!c || !c.consent || c.optedOut || replied) {
    status = "Stopped";
    description =
      "Stopped: missing contact, consent, opt-out, or inbound reply.";
  } else if (
    run.status === "Waiting" &&
    !advanceClock &&
    Date.parse(run.nextAt) > Date.now()
  ) {
    throw Error(
      "Delay is still pending. Use Advance simulated clock to skip this delay in the preview.",
    );
  } else {
    const step = run.steps[cursor];
    if (!step) {
      status = "Completed";
      description = "All local steps completed.";
    } else if (step.type === "Delay") {
      if (run.status === "Waiting") {
        cursor++;
        description = advanceClock
          ? "Preview clock advanced; delay completed."
          : "Delay completed.";
      } else {
        status = "Waiting";
        nextAt = new Date(Date.now() + step.minutes * 60000).toISOString();
        description = `Waiting ${step.minutes} minutes. No background execution.`;
      }
    } else if (step.type === "Condition") {
      const pass =
        step.condition === "Consent recorded"
          ? c.consent && !c.optedOut
          : c.stage === "Qualified";
      description = `${step.condition}: ${pass ? "passed" : "not met; run stopped"}`;
      if (pass) cursor++;
      else status = "Stopped";
    } else if (step.type === "Handoff") {
      next = addActivity(
        {
          ...s,
          tasks: [
            ...s.tasks,
            {
              id: uid(),
              contactId: c.id,
              title: "Human handoff from sequence preview",
              dueAt: now(),
              done: false,
            },
          ],
        },
        c.id,
        "Human handoff: pending outreach suppressed",
        "handoff",
      );
      cursor++;
      status = "Stopped";
      description = "Human handoff task created; further outreach stopped.";
    } else {
      const campaign: LocalCampaign = {
        id: uid(),
        name: `Sequence preview · step ${cursor + 1}`,
        channel: step.type,
        templateId: step.templateId,
        agentId: step.agentId,
        contactIds: [c.id],
        status: "Draft",
        scheduledAt: "",
        createdAt: run.startedAt,
        updatedAt: now(),
      };
      next = runCampaign(
        { ...s, campaigns: [...s.campaigns, campaign] },
        campaign.id,
      );
      cursor++;
      description = `${step.type} step simulated. Sample credits deducted.`;
    }
    if (status === "Running" && cursor >= run.steps.length)
      status = "Completed";
  }
  return {
    ...next,
    sequenceRuns: next.sequenceRuns.map((r) =>
      r.id === id
        ? { ...r, cursor, status, nextAt, history: [...r.history, description] }
        : r,
    ),
  };
}
export function validateBooking(
  resources: Resource[],
  data: Record<string, string>,
  id?: string,
) {
  const start = Date.parse(data.start),
    end = Date.parse(data.end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
    throw Error("Choose an end time after the start time");
  if (
    resources.some(
      (r) =>
        r.kind === "booking" &&
        r.id !== id &&
        r.data.status !== "Cancelled" &&
        Date.parse(r.data.start) < end &&
        Date.parse(r.data.end) > start,
    )
  )
    throw Error("This time overlaps an existing local booking");
}
export function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (!/^[1-9]\d{7,14}$/.test(digits))
    throw Error("Use an international number with 8–15 digits");
  return digits;
}
export function chatLink(phone: string, message: string) {
  return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(message)}`;
}
export function validatePublicUrl(value: string) {
  try {
    const url = new URL(value);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      throw Error();
    return url.href;
  } catch {
    throw Error("Use a public http or https URL without credentials");
  }
}
