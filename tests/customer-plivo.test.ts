import { test } from "node:test";
import assert from "node:assert/strict";
import { EncryptCommand, DecryptCommand } from "@aws-sdk/client-kms";
import {
  encryptPlivoCredentials,
  decryptPlivoCredentials,
  verifyPlivoAccount,
  verifyPlivoCaller,
  type KmsTransport,
} from "../src/lib/plivo-connection";
import {
  loadCallVoiceConfig,
  type CredentialDependencies,
} from "../services/voice/credentials";
const workspace = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const connection = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const call = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const credentials = {
  authId: "MACUSTOMERTEST123",
  authToken: "fake-token-for-unit-tests",
};
const numbers = [
  { number: "12025550123", voice_enabled: true, alias: "Sales" },
];
const response = (value: unknown) => new Response(JSON.stringify(value));

test("Plivo account verification reads owned voice numbers and never follows provider URLs", async () => {
  const urls: string[] = [];
  const transport: typeof fetch = async (url, init) => {
    urls.push(String(url));
    assert.equal(init?.method, undefined);
    assert.equal(init?.redirect, "error");
    assert.equal(
      (init?.headers as Record<string, string>).Authorization,
      `Basic ${Buffer.from(`${credentials.authId}:${credentials.authToken}`).toString("base64")}`,
    );
    if (urls.length === 1) return response({ auth_id: credentials.authId });
    if (urls.length === 2)
      return response({
        objects: numbers,
        meta: { next: "https://untrusted.example/secret" },
      });
    return response({
      objects: [{ number: "12025550124", voice_enabled: false }],
      meta: { next: null },
    });
  };
  assert.deepEqual(await verifyPlivoAccount(credentials, transport), [
    { number: "+12025550123", label: "Sales" },
  ]);
  assert.deepEqual(urls, [
    `https://api.plivo.com/v1/Account/${credentials.authId}/`,
    `https://api.plivo.com/v1/Account/${credentials.authId}/Number/?limit=20&offset=0`,
    `https://api.plivo.com/v1/Account/${credentials.authId}/Number/?limit=20&offset=20`,
  ]);
});
test("Plivo verification redacts rejection bodies and rejects wrong accounts or unowned callers", async () => {
  await assert.rejects(
    () =>
      verifyPlivoAccount(
        credentials,
        async () => new Response("secret provider body", { status: 401 }),
      ),
    { message: "plivo_credentials_rejected" },
  );
  await assert.rejects(
    () =>
      verifyPlivoAccount(credentials, async () =>
        response({ auth_id: "OTHERACCOUNT" }),
      ),
    { message: "plivo_account_mismatch" },
  );
  await assert.rejects(
    () =>
      verifyPlivoCaller(credentials, "+12025550123", async () =>
        response({ ...numbers[0], number: "12025550999" }),
      ),
    { message: "plivo_caller_not_owned" },
  );
  // Runtime configurations contain speech settings; only account fields go to Plivo.
  const runtime = { ...credentials, sarvamKey: "other-secret" };
  assert.equal(
    (
      await verifyPlivoCaller(runtime, "+12025550123", async () =>
        response(numbers[0]),
      )
    ).number,
    "+12025550123",
  );
});
test("Plivo verification bounds pagination and response sizes", async () => {
  let count = 0;
  await assert.rejects(
    () =>
      verifyPlivoAccount(credentials, async () => {
        count++;
        return response(
          count === 1
            ? { auth_id: credentials.authId }
            : { objects: numbers, meta: { next: "next" } },
        );
      }),
    { message: "plivo_number_limit_exceeded" },
  );
  assert.equal(count, 6);
  await assert.rejects(
    () =>
      verifyPlivoAccount(
        credentials,
        async () => new Response("x".repeat(64001)),
      ),
    { message: "plivo_response_invalid" },
  );
});
test("KMS credentials are bound to both workspace and connection, with no plaintext errors", async () => {
  const previous = process.env;
  process.env = {
    ...previous,
    AWS_REGION: "ap-south-1",
    AWS_KMS_KEY_ID: "unit-test-key",
  };
  try {
    let stored: Uint8Array | undefined;
    const transport: KmsTransport = async (command) => {
      assert.deepEqual(command.input.EncryptionContext, {
        workspaceId: workspace,
        connectionId: connection,
        provider: "plivo",
      });
      assert.equal(command.input.KeyId, "unit-test-key");
      if (command instanceof EncryptCommand) {
        stored = command.input.Plaintext as Uint8Array;
        return { CiphertextBlob: Buffer.from("fake-ciphertext") };
      }
      assert.ok(command instanceof DecryptCommand);
      return { Plaintext: stored };
    };
    const encrypted = await encryptPlivoCredentials(
      credentials,
      workspace,
      connection,
      transport,
    );
    assert.ok(!encrypted.includes(credentials.authToken));
    assert.deepEqual(
      await decryptPlivoCredentials(
        encrypted,
        workspace,
        connection,
        transport,
      ),
      credentials,
    );
    await assert.rejects(
      () =>
        decryptPlivoCredentials(encrypted, workspace, connection, async () => {
          throw Error(credentials.authToken);
        }),
      { message: "plivo_decryption_failed" },
    );
  } finally {
    process.env = previous;
  }
});
function dependencies(): CredentialDependencies {
  return {
    binding: async () => ({
      workspace_id: workspace,
      plivo_connection_id: connection,
    }),
    workspaceBinding: async () => null,
    connection: async (w, id) => ({
      id,
      workspace_id: w,
      auth_id: credentials.authId,
      ciphertext: "encrypted",
      status: "connected",
    }),
    decrypt: async (_cipher, w, id) => {
      assert.equal(w, workspace);
      assert.equal(id, connection);
      return credentials;
    },
    service: () => ({
      publicUrl: "https://voice.example.com",
      sarvamKey: "fake",
      cartesiaKey: "fake",
      englishVoice: call,
      hindiVoice: call,
    }),
  };
}
test("call credential resolution rejects tenant/account mismatches and missing bindings", async () => {
  const deps = dependencies();
  assert.equal(
    (await loadCallVoiceConfig(call, deps)).authId,
    credentials.authId,
  );
  await assert.rejects(
    () => loadCallVoiceConfig(call, { ...deps, binding: async () => null }),
    { message: "plivo_not_connected" },
  );
  await assert.rejects(
    () =>
      loadCallVoiceConfig(call, {
        ...deps,
        connection: async () => ({
          id: connection,
          workspace_id: call,
          auth_id: credentials.authId,
          ciphertext: "encrypted",
          status: "connected",
        }),
      }),
    { message: "plivo_connection_mismatch" },
  );
  await assert.rejects(
    () =>
      loadCallVoiceConfig(call, {
        ...deps,
        decrypt: async () => ({ ...credentials, authId: "OTHERACCOUNT123" }),
      }),
    { message: "plivo_account_mismatch" },
  );
});
