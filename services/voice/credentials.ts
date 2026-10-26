import { z } from "zod";
import {
  voiceServiceConfig,
  type VoiceConfig,
  type VoiceServiceConfig,
} from "../../src/lib/voice";
import {
  decryptPlivoCredentials,
  plivoCredentialsSchema,
  PlivoConnectionError,
  type PlivoCredentials,
} from "../../src/lib/plivo-connection";
import { voiceDb } from "./store";
type Binding = { workspace_id: string; plivo_connection_id: string | null };
export type CustomerPlivoConnection = {
  id: string;
  workspace_id: string;
  auth_id: string;
  ciphertext: string | null;
  status: string;
};
export type CredentialDependencies = {
  binding: (callId: string) => Promise<Binding | null>;
  workspaceBinding: (workspaceId: string) => Promise<Binding | null>;
  connection: (
    workspaceId: string,
    id: string,
  ) => Promise<CustomerPlivoConnection | null>;
  decrypt: typeof decryptPlivoCredentials;
  service: () => VoiceServiceConfig;
};
const defaults: CredentialDependencies = {
  binding: async (callId) => {
    const { data, error } = await voiceDb()
      .from("calls")
      .select("workspace_id,plivo_connection_id")
      .eq("id", callId)
      .single();
    if (error) throw new PlivoConnectionError("plivo_connection_unavailable");
    return data;
  },
  workspaceBinding: async (workspaceId) => {
    const { data, error } = await voiceDb()
      .from("voice_settings")
      .select("workspace_id,plivo_connection_id")
      .eq("workspace_id", workspaceId)
      .single();
    if (error) throw new PlivoConnectionError("plivo_connection_unavailable");
    return data;
  },
  connection: async (workspaceId, id) => {
    const { data, error } = await voiceDb()
      .from("plivo_connections")
      .select("id,workspace_id,auth_id,ciphertext,status")
      .eq("workspace_id", workspaceId)
      .eq("id", id)
      .single();
    if (error) throw new PlivoConnectionError("plivo_connection_unavailable");
    return data;
  },
  decrypt: decryptPlivoCredentials,
  service: voiceServiceConfig,
};
async function resolve(
  binding: Binding | null,
  deps: CredentialDependencies,
): Promise<PlivoCredentials> {
  if (
    !binding ||
    !z.uuid().safeParse(binding.workspace_id).success ||
    !z.uuid().safeParse(binding.plivo_connection_id).success
  )
    throw new PlivoConnectionError("plivo_not_connected");
  const connection = await deps.connection(
    binding.workspace_id,
    binding.plivo_connection_id!,
  );
  if (
    !connection ||
    connection.workspace_id !== binding.workspace_id ||
    connection.id !== binding.plivo_connection_id ||
    connection.status !== "connected" ||
    !connection.ciphertext
  )
    throw new PlivoConnectionError("plivo_connection_mismatch");
  const secret = await deps.decrypt(
    connection.ciphertext,
    connection.workspace_id,
    connection.id,
  );
  const credentials = plivoCredentialsSchema.parse(secret);
  if (credentials.authId !== connection.auth_id)
    throw new PlivoConnectionError("plivo_account_mismatch");
  return credentials;
}
export async function loadCallVoiceConfig(
  callId: string,
  deps: CredentialDependencies = defaults,
): Promise<VoiceConfig> {
  if (!z.uuid().safeParse(callId).success)
    throw new PlivoConnectionError("invalid_call_id");
  const credentials = await resolve(await deps.binding(callId), deps);
  return { ...deps.service(), ...credentials };
}
export async function loadWorkspacePlivoCredentials(
  workspaceId: string,
  deps: CredentialDependencies = defaults,
): Promise<PlivoCredentials> {
  if (!z.uuid().safeParse(workspaceId).success)
    throw new PlivoConnectionError("plivo_connection_invalid");
  return resolve(await deps.workspaceBinding(workspaceId), deps);
}
