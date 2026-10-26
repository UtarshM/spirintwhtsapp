import { KMSClient, EncryptCommand, DecryptCommand } from "@aws-sdk/client-kms";
import { z } from "zod";
import { phoneSchema } from "./voice";

export const plivoCredentialsSchema = z
  .object({
    authId: z
      .string()
      .trim()
      .regex(/^[A-Z0-9]{10,64}$/),
    authToken: z
      .string()
      .trim()
      .min(16)
      .max(128)
      .regex(/^[A-Za-z0-9_-]+$/),
  })
  .strict();
export type PlivoCredentials = z.infer<typeof plivoCredentialsSchema>;
export type PlivoNumber = { number: string; label: string };
export class PlivoConnectionError extends Error {
  constructor(public code: string) {
    super(code);
  }
}
export function plivoStorageConfigured() {
  return Boolean(process.env.AWS_KMS_KEY_ID && process.env.AWS_REGION);
}
export type KmsTransport = (
  command: EncryptCommand | DecryptCommand,
) => Promise<{ CiphertextBlob?: Uint8Array; Plaintext?: Uint8Array }>;
const kmsTransport: KmsTransport = async (command) => {
  const client = new KMSClient({ region: process.env.AWS_REGION });
  try {
    return await (command instanceof EncryptCommand
      ? client.send(command)
      : client.send(command));
  } finally {
    client.destroy();
  }
};
function context(workspaceId: string, connectionId: string) {
  if (
    !z.uuid().safeParse(workspaceId).success ||
    !z.uuid().safeParse(connectionId).success
  )
    throw new PlivoConnectionError("plivo_connection_invalid");
  return { workspaceId, connectionId, provider: "plivo" };
}
export async function encryptPlivoCredentials(
  value: PlivoCredentials,
  workspaceId: string,
  connectionId: string,
  transport: KmsTransport = kmsTransport,
) {
  if (!plivoStorageConfigured())
    throw new PlivoConnectionError("plivo_storage_unavailable");
  const credentials = plivoCredentialsSchema.parse(value),
    encryptionContext = context(workspaceId, connectionId);
  try {
    const result = await transport(
      new EncryptCommand({
        KeyId: process.env.AWS_KMS_KEY_ID,
        EncryptionContext: encryptionContext,
        Plaintext: Buffer.from(JSON.stringify(credentials)),
      }),
    );
    if (!result.CiphertextBlob) throw Error("empty_ciphertext");
    return Buffer.from(result.CiphertextBlob).toString("base64");
  } catch {
    throw new PlivoConnectionError("plivo_encryption_failed");
  }
}
export async function decryptPlivoCredentials(
  ciphertext: string,
  workspaceId: string,
  connectionId: string,
  transport: KmsTransport = kmsTransport,
) {
  if (!plivoStorageConfigured())
    throw new PlivoConnectionError("plivo_storage_unavailable");
  const encryptionContext = context(workspaceId, connectionId);
  if (
    typeof ciphertext !== "string" ||
    ciphertext.length > 64000 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(ciphertext)
  )
    throw new PlivoConnectionError("plivo_connection_invalid");
  try {
    const result = await transport(
      new DecryptCommand({
        KeyId: process.env.AWS_KMS_KEY_ID,
        EncryptionContext: encryptionContext,
        CiphertextBlob: Buffer.from(ciphertext, "base64"),
      }),
    );
    if (!result.Plaintext || result.Plaintext.length > 2000)
      throw Error("invalid_plaintext");
    return plivoCredentialsSchema.parse(
      JSON.parse(Buffer.from(result.Plaintext).toString("utf8")),
    );
  } catch {
    throw new PlivoConnectionError("plivo_decryption_failed");
  }
}
async function readPlivo(
  credentials: PlivoCredentials,
  path: string,
  transport: typeof fetch,
) {
  if (
    !/^(?:Number\/(?:[1-9]\d{7,14}\/|\?limit=20&offset=\d{1,3}))?$/.test(path)
  )
    throw new PlivoConnectionError("plivo_read_path_invalid");
  const parsed = plivoCredentialsSchema.parse({
    authId: credentials.authId,
    authToken: credentials.authToken,
  });
  let response: Response;
  try {
    response = await transport(
      `https://api.plivo.com/v1/Account/${encodeURIComponent(parsed.authId)}/${path}`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${parsed.authId}:${parsed.authToken}`).toString("base64")}`,
        },
        signal: AbortSignal.timeout(7000),
        redirect: "error",
        cache: "no-store",
      },
    );
  } catch {
    throw new PlivoConnectionError("plivo_verification_unavailable");
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new PlivoConnectionError(
      response.status === 401 || response.status === 403
        ? "plivo_credentials_rejected"
        : "plivo_verification_unavailable",
    );
  }
  const reader = response.body?.getReader();
  if (!reader) throw new PlivoConnectionError("plivo_response_invalid");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 64000) throw Error("response_too_large");
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<
      string,
      unknown
    >;
  } catch {
    throw new PlivoConnectionError("plivo_response_invalid");
  } finally {
    await reader.cancel().catch(() => {});
  }
}
function ownedNumber(value: unknown): PlivoNumber | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (
    row.voice_enabled !== true &&
    row.voice_enabled !== "true" &&
    row.voice_enabled !== "True"
  )
    return null;
  if (typeof row.number !== "string") return null;
  const number = row.number.startsWith("+") ? row.number : `+${row.number}`;
  if (!phoneSchema.safeParse(number).success) return null;
  return {
    number,
    label: typeof row.alias === "string" ? row.alias.slice(0, 120) : "",
  };
}
export async function verifyPlivoAccount(
  credentials: PlivoCredentials,
  transport: typeof fetch = fetch,
): Promise<PlivoNumber[]> {
  const account = await readPlivo(credentials, "", transport);
  if (account.auth_id !== credentials.authId)
    throw new PlivoConnectionError("plivo_account_mismatch");
  const numbers: PlivoNumber[] = [];
  for (let page = 0; page < 5; page++) {
    const response = await readPlivo(
      credentials,
      `Number/?limit=20&offset=${page * 20}`,
      transport,
    );
    if (!Array.isArray(response.objects) || response.objects.length > 20)
      throw new PlivoConnectionError("plivo_response_invalid");
    for (const row of response.objects) {
      const number = ownedNumber(row);
      if (number && !numbers.some((n) => n.number === number.number))
        numbers.push(number);
    }
    const next = (response.meta as { next?: unknown } | undefined)?.next;
    if (!next) {
      if (!numbers.length)
        throw new PlivoConnectionError("plivo_voice_number_required");
      return numbers;
    }
    if (typeof next !== "string" || !response.objects.length)
      throw new PlivoConnectionError("plivo_response_invalid");
  }
  throw new PlivoConnectionError("plivo_number_limit_exceeded");
}
export async function verifyPlivoCaller(
  credentials: PlivoCredentials,
  caller: string,
  transport: typeof fetch = fetch,
) {
  phoneSchema.parse(caller);
  const result = ownedNumber(
    await readPlivo(credentials, `Number/${caller.slice(1)}/`, transport),
  );
  if (!result || result.number !== caller)
    throw new PlivoConnectionError("plivo_caller_not_owned");
  return result;
}
