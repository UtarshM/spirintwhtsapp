import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parsePlivoCdr,
  plivoFinalStatus,
  type VoiceFinalStatus,
} from "../src/lib/voice-outcomes";
import {
  MAX_RECONCILIATION_ATTEMPTS,
  reconcileVoiceCalls,
  reconciliationDelayMs,
  type ReconciliationCall,
  type ReconciliationDependencies,
  type ReconciliationUpdate,
} from "../services/voice/reconcile";
import type { VoiceConfig } from "../src/lib/voice";

const providerId = "11111111-1111-4111-8111-111111111111";
const now = new Date("2026-10-25T12:00:00.000Z");
const complete = (id = providerId) => ({
  call_uuid: id,
  from_number: "12025550123",
  to_number: "919876543210",
  answer_time: "2026-10-25 16:58:00+05:30",
  end_time: "2026-10-25 16:58:10+05:30",
  bill_duration: 10,
  hangup_cause_code: 4000,
  hangup_cause_name: "Normal Hangup",
});

test("Plivo completion requires an ended CDR, matching identity and valid duration", () => {
  assert.deepEqual(parsePlivoCdr(complete(), providerId), {
    state: "complete",
    billedSeconds: 10,
    finalStatus: "completed",
  });
  assert.deepEqual(
    parsePlivoCdr({ ...complete(), end_time: null }, providerId),
    {
      state: "retry",
      code: "voice_cdr_incomplete",
    },
  );
  assert.equal(
    parsePlivoCdr({ ...complete(), end_time: "unexpected" }, providerId).state,
    "retry",
  );
  assert.deepEqual(parsePlivoCdr(complete("other-call"), providerId), {
    state: "manual",
    code: "voice_cdr_binding_conflict",
  });
  for (const duration of [-1, 1.5, "1.5", "-1", null, 86401])
    assert.equal(
      parsePlivoCdr({ ...complete(), bill_duration: duration }, providerId)
        .state,
      "retry",
    );
});

test("Plivo outcomes use documented causes rather than a generic completed status", () => {
  for (const [code, name, expected] of [
    [3010, "Busy Line", "busy"],
    [3100, "Busy everywhere", "busy"],
    [3000, "No Answer", "no-answer"],
    [6010, "Ring Timeout Reached", "no-answer"],
    [1000, "Canceled", "cancel"],
    [1010, "Canceled (Out Of Credits)", "failed"],
    [8011, "Invalid Answer XML", "failed"],
    [5000, "Network Error", "failed"],
  ] as const) {
    const cdr = {
      ...complete(),
      answer_time: null,
      bill_duration: 0,
      hangup_cause_code: code,
      hangup_cause_name: name,
      CallStatus: "completed",
    };
    assert.equal(plivoFinalStatus(cdr), expected);
    assert.deepEqual(parsePlivoCdr(cdr, providerId), {
      state: "complete",
      billedSeconds: 0,
      finalStatus: expected,
    });
    assert.equal(
      plivoFinalStatus({
        HangupCauseCode: String(code),
        HangupCauseName: name,
        BillDuration: "0",
        CallStatus: "completed",
      }),
      expected,
    );
  }
  assert.equal(
    plivoFinalStatus({
      HangupCauseName: " NORMAL   HANGUP ",
      AnswerTime: complete().answer_time,
      BillDuration: "0",
    }),
    "completed",
  );
  assert.equal(
    plivoFinalStatus({ HangupCause: "USER_BUSY", BillDuration: "0" }),
    "busy",
  );
  assert.equal(
    plivoFinalStatus({ HangupCause: "NORMAL_CLEARING", BillDuration: "1" }),
    "completed",
  );
});

test("unknown and contradictory call outcomes remain unsettled", () => {
  for (const cdr of [
    { CallStatus: "completed", BillDuration: "0" },
    { hangup_cause_code: 0, hangup_cause_name: "Unknown", bill_duration: 20 },
    {
      hangup_cause_code: 9999,
      hangup_cause_name: "New provider outcome",
      bill_duration: 20,
    },
    {
      hangup_cause_code: 4000,
      hangup_cause_name: "Normal Hangup",
      bill_duration: 0,
    },
    {
      hangup_cause_code: 3010,
      hangup_cause_name: "Normal Hangup",
      bill_duration: 0,
    },
    { hangup_cause_code: 3010, bill_duration: 5 },
    { HangupCauseCode: "16", BillDuration: "1" }, // Q.850 normal clearing isn't a Voice API code.
    {
      HangupCauseCode: "9999",
      HangupCauseName: "Normal Hangup",
      BillDuration: "1",
    },
  ])
    assert.equal(plivoFinalStatus(cdr), null);
  assert.equal(
    parsePlivoCdr(
      {
        ...complete(),
        hangup_cause_name: "New outcome",
        hangup_cause_code: 9999,
      },
      providerId,
    ).state,
    "retry",
  );
});

type Row = ReconciliationCall & {
  reconciliation_state: "pending" | "manual" | "settled";
  created_at: string;
  reconcile_after: string;
  ended_at: string | null;
  last_error: string | null;
};
function row(id: string, provider: string | null = id): Row {
  return {
    id,
    provider_id: provider,
    caller_id: "+12025550123",
    destination: "+919876543210",
    reconcile_attempts: 0,
    reconciliation_state: "pending",
    created_at: "2026-10-25T09:00:00.000Z",
    reconcile_after: "2026-10-25T10:00:00.000Z",
    ended_at: null,
    last_error: null,
  };
}
function harness(rows: Row[], records: Record<string, unknown | Error>) {
  let clock = new Date(now);
  const fetches: string[] = [],
    settlements: { id: string; seconds: number; status: VoiceFinalStatus }[] =
      [],
    updates: { id: string; patch: ReconciliationUpdate }[] = [];
  const deps: ReconciliationDependencies = {
    now: () => clock,
    config: () => ({}) as VoiceConfig,
    due: async (at, createdBefore) =>
      rows
        .filter(
          (r) =>
            r.reconciliation_state === "pending" &&
            !r.ended_at &&
            r.reconcile_after <= at &&
            r.created_at < createdBefore,
        )
        .sort(
          (a, b) =>
            a.created_at.localeCompare(b.created_at) ||
            a.id.localeCompare(b.id),
        )
        .slice(0, 100),
    cdr: async (_config, id) => {
      fetches.push(id);
      if (records[id] instanceof Error) throw records[id];
      return records[id];
    },
    finish: async (call, seconds, status) => {
      settlements.push({ id: call.id, seconds, status });
      Object.assign(
        rows.find((r) => r.id === call.id)!,
        { ended_at: clock.toISOString(), reconciliation_state: "settled" },
      );
    },
    update: async (call, patch) => {
      updates.push({ id: call.id, patch });
      Object.assign(
        rows.find((r) => r.id === call.id)!,
        patch,
      );
    },
  };
  return {
    deps,
    rows,
    fetches,
    settlements,
    updates,
    advance: (ms: number) => {
      clock = new Date(clock.getTime() + ms);
    },
  };
}

test("one-shot reconciliation separates manual, retry and definitive settlement outcomes", async () => {
  const h = harness(
    [
      row("unbound", null),
      row("busy"),
      row("incomplete"),
      row("provider-down"),
      row("wrong-binding"),
    ],
    {
      busy: {
        ...complete("busy"),
        answer_time: null,
        bill_duration: 0,
        hangup_cause_code: 3010,
        hangup_cause_name: "Busy Line",
      },
      incomplete: { ...complete("incomplete"), end_time: null },
      "provider-down": Error("provider response containing secret data"),
      "wrong-binding": complete("another-tenant-call"),
    },
  );
  assert.deepEqual(await reconcileVoiceCalls(h.deps), {
    settled: 1,
    manual: 2,
    retry: 2,
  });
  assert.deepEqual(h.settlements, [{ id: "busy", seconds: 0, status: "busy" }]);
  assert.equal(h.fetches.includes("unbound"), false);
  assert.equal(
    h.rows.find((r) => r.id === "unbound")!.reconciliation_state,
    "manual",
  );
  assert.equal(
    h.rows.find((r) => r.id === "incomplete")!.last_error,
    "voice_cdr_incomplete",
  );
  assert.equal(
    h.rows.find((r) => r.id === "provider-down")!.last_error,
    "voice_cdr_fetch_failed",
  );
  assert.equal(JSON.stringify(h.updates).includes("secret data"), false);
});

test("unknown identities cannot starve later calls behind the 100-row batch", async () => {
  const rows = Array.from({ length: 100 }, (_, i) =>
    row(`manual-${String(i).padStart(3, "0")}`, null),
  );
  rows.push({ ...row("recoverable"), created_at: "2026-10-25T09:01:00.000Z" });
  const h = harness(rows, { recoverable: complete("recoverable") });
  assert.deepEqual(await reconcileVoiceCalls(h.deps), {
    settled: 0,
    manual: 100,
    retry: 0,
  });
  assert.deepEqual(await reconcileVoiceCalls(h.deps), {
    settled: 1,
    manual: 0,
    retry: 0,
  });
  assert.deepEqual(h.fetches, ["recoverable"]);
});

test("each call uses its own customer credentials and a missing connection fails closed", async () => {
  const h = harness(
    [
      row("customer-a"),
      row("customer-b"),
      { ...row("missing-connection"), created_at: "2026-10-25T08:59:00.000Z" },
      row("unbound", null),
    ],
    {
      "customer-a": complete("customer-a"),
      "customer-b": complete("customer-b"),
    },
  );
  const requestedConfigs: string[] = [],
    routed: { providerId: string; authId: string }[] = [];
  const customerA = {
      authId: "MAcustomerA",
      authToken: "customer-a-private",
    } as VoiceConfig,
    customerB = {
      authId: "MAcustomerB",
      authToken: "customer-b-private",
    } as VoiceConfig;
  h.deps.config = async (call) => {
    requestedConfigs.push(call.id);
    if (call.id === "customer-a") return customerA;
    if (call.id === "customer-b") return customerB;
    throw Error("connection_missing_or_wrong_workspace");
  };
  const cdr = h.deps.cdr;
  h.deps.cdr = async (config, id) => {
    routed.push({ providerId: id, authId: config.authId });
    assert.equal(config, id === "customer-a" ? customerA : customerB);
    return cdr(config, id);
  };
  assert.deepEqual(await reconcileVoiceCalls(h.deps), {
    settled: 2,
    manual: 1,
    retry: 1,
  });
  assert.deepEqual(requestedConfigs, [
    "missing-connection",
    "customer-a",
    "customer-b",
  ]);
  assert.deepEqual(routed, [
    { providerId: "customer-a", authId: "MAcustomerA" },
    { providerId: "customer-b", authId: "MAcustomerB" },
  ]);
  assert.equal(
    h.rows.find((r) => r.id === "missing-connection")!.ended_at,
    null,
  );
  assert.equal(
    h.rows.find((r) => r.id === "missing-connection")!.last_error,
    "voice_cdr_fetch_failed",
  );
  assert.equal(
    h.settlements.some((s) => s.id === "missing-connection"),
    false,
  );
  assert.equal(JSON.stringify(h.updates).includes("private"), false);
});

test("incomplete CDRs back off, exhaust to manual review, and never release credits", async () => {
  const h = harness([row("incomplete")], {
    incomplete: { ...complete("incomplete"), end_time: null },
  });
  for (let attempt = 1; attempt <= MAX_RECONCILIATION_ATTEMPTS; attempt++) {
    const result = await reconcileVoiceCalls(h.deps);
    assert.equal(result.settled, 0);
    assert.equal(result.retry, attempt < MAX_RECONCILIATION_ATTEMPTS ? 1 : 0);
    assert.equal(
      result.manual,
      attempt === MAX_RECONCILIATION_ATTEMPTS ? 1 : 0,
    );
    assert.equal(h.rows[0].reconcile_attempts, attempt);
    assert.deepEqual(await reconcileVoiceCalls(h.deps), {
      settled: 0,
      manual: 0,
      retry: 0,
    });
    h.advance(reconciliationDelayMs(attempt));
  }
  h.advance(24 * 60 * 60000);
  assert.deepEqual(await reconcileVoiceCalls(h.deps), {
    settled: 0,
    manual: 0,
    retry: 0,
  });
  assert.equal(h.settlements.length, 0);
  assert.equal(h.rows[0].reconciliation_state, "manual");
  assert.ok(reconciliationDelayMs(100) <= 30 * 60000);
});

test("transactional settlement rejection preserves the call for retry and processes later rows", async () => {
  const h = harness([row("conflict"), row("valid")], {
    conflict: complete("conflict"),
    valid: complete("valid"),
  });
  const finish = h.deps.finish;
  h.deps.finish = async (call, seconds, status) => {
    if (call.id === "conflict") throw Error("call_duration_exceeded");
    await finish(call, seconds, status);
  };
  assert.deepEqual(await reconcileVoiceCalls(h.deps), {
    settled: 1,
    manual: 0,
    retry: 1,
  });
  assert.equal(h.rows.find((r) => r.id === "conflict")!.ended_at, null);
  assert.equal(
    h.rows.find((r) => r.id === "conflict")!.last_error,
    "voice_settlement_requires_reconciliation",
  );
  assert.deepEqual(
    h.settlements.map((s) => s.id),
    ["valid"],
  );
});

test("CDRs must match snapshotted caller and destination before settlement", () => {
  const binding = { caller_id: "+12025550123", destination: "+919876543210" };
  assert.equal(
    parsePlivoCdr(complete(), providerId, binding).state,
    "complete",
  );
  for (const change of [
    { from_number: "12025550999" },
    { to_number: "919876543211" },
    { from_number: undefined },
  ]) {
    assert.deepEqual(
      parsePlivoCdr({ ...complete(), ...change }, providerId, binding),
      { state: "manual", code: "voice_cdr_number_conflict" },
    );
  }
});
