export type SendingWindow = {
  weekday: number;
  start: string;
  end: string;
  enabled: boolean;
};
export function canSendAt(
  date: Date,
  timezone: string,
  windows: SendingWindow[],
) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: string) =>
    parts.find((p) => p.type === type)?.value || "";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    part("weekday"),
  );
  const minutes = Number(part("hour")) * 60 + Number(part("minute"));
  return windows.some((w) => {
    const parse = (s: string) => {
      const [h, m] = s.split(":").map(Number);
      return h * 60 + m;
    };
    return (
      w.enabled &&
      w.weekday === weekday &&
      minutes >= parse(w.start) &&
      minutes < parse(w.end)
    );
  });
}
export type ExecutionContact = {
  consent: boolean;
  optedOut: boolean;
  enrollmentStatus: string;
};
export function outreachAllowed(contact: ExecutionContact) {
  return (
    contact.consent &&
    !contact.optedOut &&
    contact.enrollmentStatus === "active"
  );
}
