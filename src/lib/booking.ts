import { now, uid, type LocalWorkspace } from "./local-workspace";
export function saveAvailability(
  state: LocalWorkspace,
  days: string[],
  start: string,
  end: string,
): LocalWorkspace {
  if (
    !days.length ||
    days.some((day) => !/^[0-6]$/.test(day)) ||
    new Set(days).size !== days.length ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(start) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(end) ||
    start >= end
  )
    throw Error("Choose weekdays and a valid opening and closing time.");
  const existing = state.resources.find((r) => r.kind === "availability");
  const resource = {
    id: existing?.id || uid(),
    kind: "availability" as const,
    name: "Booking availability",
    data: {
      days: days.join(","),
      start,
      end,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    updatedAt: now(),
  };
  return {
    ...state,
    resources: [
      ...state.resources.filter((r) => r.kind !== "availability"),
      resource,
    ],
  };
}
export function createReminder(
  state: LocalWorkspace,
  bookingId: string,
  minutes: number,
  channel: string,
  body: string,
): LocalWorkspace {
  const booking = state.resources.find(
    (r) =>
      r.id === bookingId &&
      r.kind === "booking" &&
      r.data.status !== "Cancelled" &&
      r.data.archived !== "true",
  );
  if (!booking || !Number.isFinite(Date.parse(booking.data.start)))
    throw Error("Choose an active appointment.");
  if (
    ![15, 30, 60, 1440].includes(minutes) ||
    !["WhatsApp", "Email"].includes(channel) ||
    !body.trim() ||
    body.length > 2000
  )
    throw Error("Choose a reminder time, channel and message.");
  const dueAt = new Date(
    Date.parse(booking.data.start) - minutes * 60_000,
  ).toISOString();
  if (Date.parse(dueAt) <= Date.now())
    throw Error("The reminder time must be in the future.");
  if (
    state.resources.some(
      (r) =>
        r.kind === "reminder" &&
        r.data.bookingId === bookingId &&
        r.data.minutes === String(minutes) &&
        r.data.channel === channel &&
        r.data.archived !== "true",
    )
  )
    throw Error("This appointment already has that reminder draft.");
  return {
    ...state,
    resources: [
      ...state.resources,
      {
        id: uid(),
        kind: "reminder",
        name: `${booking.name} reminder`,
        data: {
          bookingId,
          minutes: String(minutes),
          channel,
          body: body.trim(),
          dueAt,
          status: "Draft",
        },
        updatedAt: now(),
      },
    ],
  };
}
export function reminderTask(
  state: LocalWorkspace,
  reminderId: string,
): LocalWorkspace {
  const reminder = state.resources.find(
    (r) =>
      r.id === reminderId &&
      r.kind === "reminder" &&
      r.data.archived !== "true",
  );
  const booking = state.resources.find(
    (r) => r.id === reminder?.data.bookingId && r.kind === "booking",
  );
  if (
    !reminder ||
    !booking ||
    booking.data.status === "Cancelled" ||
    booking.data.archived === "true"
  )
    throw Error("The appointment is no longer active.");
  if (reminder.data.taskId)
    throw Error("A follow-up task already exists for this reminder.");
  const id = uid();
  return {
    ...state,
    tasks: [
      ...state.tasks,
      {
        id,
        title: `Review ${reminder.data.channel} reminder: ${booking.name}`,
        contactId: booking.data.contactId || "",
        dueAt: reminder.data.dueAt,
        done: false,
      },
    ],
    resources: state.resources.map((r) =>
      r.id === reminderId
        ? {
            ...r,
            data: { ...r.data, taskId: id, status: "Task created" },
            updatedAt: now(),
          }
        : r,
    ),
  };
}
