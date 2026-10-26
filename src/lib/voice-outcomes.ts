export type VoiceFinalStatus =
  "completed" | "failed" | "busy" | "no-answer" | "cancel";
type Fields = Record<string, unknown>;
const fields = (value: unknown): Fields =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Fields)
    : {};
function integer(value: unknown): number | null {
  if (typeof value === "string" && /^\d{1,6}$/.test(value))
    value = Number(value);
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}
function timestamp(value: unknown) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/.test(value)
  )
    return null;
  const parsed = Date.parse(value.replace(" ", "T"));
  return Number.isFinite(parsed) ? parsed : null;
}
const normalizedName = (value: unknown) =>
  typeof value === "string" && value.length <= 200
    ? value.trim().toLowerCase().replace(/\s+/g, " ")
    : "";

// Voice API codes, not the unrelated raw SIP/Q.850 code spaces.
// https://docs.plivo.com/docs/voice/troubleshooting/hangup-causes
const causes: [number, string, VoiceFinalStatus][] = [
  [1000, "Canceled", "cancel"],
  [1010, "Canceled (Out Of Credits)", "failed"],
  [1020, "Canceled (Simultaneous dial limit reached)", "failed"],
  [2000, "Invalid Destination Address", "failed"],
  [2010, "Destination Out Of Service", "failed"],
  [2020, "Endpoint Not Registered", "failed"],
  [2030, "Destination Country Barred", "failed"],
  [2040, "Destination Number Barred", "failed"],
  [2050, "Destination Prefix Barred", "failed"],
  [2060, "Loop Detected", "failed"],
  [2070, "Violates Media Anchoring", "failed"],
  [3000, "No Answer", "no-answer"],
  [3010, "Busy Line", "busy"],
  [3020, "Rejected", "failed"],
  [3030, "Unknown Caller ID", "failed"],
  [3040, "Forbidden", "failed"],
  [3050, "Unallocated number", "failed"],
  [3070, "Request timeout", "failed"],
  [3080, "Internal server error from carrier", "failed"],
  [3090, "Network congestion from carrier", "failed"],
  [3100, "Busy everywhere", "busy"],
  [3110, "Declined", "failed"],
  [3120, "User does not exist anywhere", "failed"],
  [3130, "Spam block", "failed"],
  [3140, "DNO Caller ID", "failed"],
  [4000, "Normal Hangup", "completed"],
  [4010, "End Of XML Instructions", "completed"],
  [4020, "Multiparty Call Ended", "completed"],
  [4030, "Kicked Out Of Multiparty Call", "completed"],
  [4210, "sip_auth_failed", "failed"],
  [4240, "sip_auth_failed", "failed"],
  [4250, "sip_auth_timeout", "failed"],
  [5000, "Network Error", "failed"],
  [5010, "Internal Error", "failed"],
  [5020, "Routing Error", "failed"],
  [5030, "Concurrency Limit Breached", "failed"],
  [6000, "Scheduled Hangup", "completed"],
  [6010, "Ring Timeout Reached", "no-answer"],
  [6020, "Media Timeout", "failed"],
  [7011, "Error Reaching Answer URL", "failed"],
  [7012, "Error Reaching Action URL", "failed"],
  [7013, "Error Reaching Transfer URL", "failed"],
  [7014, "Error Reaching Redirect URL", "failed"],
  [7022, "Invalid Action URL", "failed"],
  [7023, "Invalid Transfer URL", "failed"],
  [7024, "Invalid Redirect URL", "failed"],
  [7032, "Invalid Method For Action URL", "failed"],
  [7033, "Invalid Method For Transfer URL", "failed"],
  [7034, "Invalid Method For Redirect URL", "failed"],
  [8011, "Invalid Answer XML", "failed"],
  [8012, "Invalid Action XML", "failed"],
  [8013, "Invalid Transfer XML", "failed"],
  [8014, "Invalid Redirect XML", "failed"],
  [9000, "Lost Race", "cancel"],
  [9100, "Machine Detected", "failed"], // Voicemail is not a completed AI conversation.
  [9110, "Confirm Key Challenge Failed", "failed"],
];
const byCode = new Map(causes.map(([code, , status]) => [code, status]));
const byName = new Map(
  causes.map(([, name, status]) => [normalizedName(name), status]),
);

/**
 * Normalize a verified CDR or signed hangup callback. A normal hangup needs
 * answer evidence; CallStatus="completed" alone never establishes success.
 * null means the outcome is unknown or contradictory and needs reconciliation.
 */
export function plivoFinalStatus(value: unknown): VoiceFinalStatus | null {
  const record = fields(value),
    code = integer(record.hangup_cause_code ?? record.HangupCauseCode),
    name = normalizedName(record.hangup_cause_name ?? record.HangupCauseName),
    coded = code === null ? undefined : byCode.get(code),
    named = byName.get(name);
  if (code !== null && !coded) return null;
  if (coded && named && coded !== named) return null;
  let outcome = coded || named;
  if (!outcome && code === null && !name) {
    const raw = normalizedName(record.HangupCause);
    if (raw === "normal_clearing") outcome = "completed";
    if (raw === "user_busy") outcome = "busy";
  }
  if (!outcome) return null;
  const answered =
    timestamp(record.answer_time ?? record.AnswerTime) !== null ||
    (integer(record.bill_duration ?? record.BillDuration) ?? 0) > 0;
  if (outcome === "completed" && !answered) return null;
  if (["busy", "no-answer", "cancel"].includes(outcome) && answered)
    return null;
  return outcome;
}

export type PlivoCdrResult =
  | { state: "complete"; billedSeconds: number; finalStatus: VoiceFinalStatus }
  | { state: "retry" | "manual"; code: string };

/** REST CDRs only. Customer-owned signatures are not billing authority. */
export function parsePlivoCdr(
  value: unknown,
  expectedProviderId: string,
  expectedNumbers?: { caller_id: string; destination: string },
): PlivoCdrResult {
  const record = fields(value);
  if (record.call_uuid !== expectedProviderId)
    return { state: "manual", code: "voice_cdr_binding_conflict" };
  if (
    expectedNumbers &&
    (typeof record.from_number !== "string" ||
      typeof record.to_number !== "string" ||
      record.from_number.replace(/^\+?/, "+") !== expectedNumbers.caller_id ||
      record.to_number.replace(/^\+?/, "+") !== expectedNumbers.destination)
  )
    return { state: "manual", code: "voice_cdr_number_conflict" };
  if (!record.end_time) return { state: "retry", code: "voice_cdr_incomplete" };
  if (timestamp(record.end_time) === null)
    return { state: "retry", code: "voice_cdr_end_time_invalid" };
  const billedSeconds = integer(record.bill_duration);
  if (billedSeconds === null || billedSeconds > 86400)
    return { state: "retry", code: "voice_cdr_duration_invalid" };
  const finalStatus = plivoFinalStatus(record);
  if (finalStatus === null)
    return { state: "retry", code: "voice_cdr_outcome_unknown" };
  return { state: "complete", billedSeconds, finalStatus };
}
