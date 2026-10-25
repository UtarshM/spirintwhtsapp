import { NextResponse } from "next/server";
import { authorize, apiError, ApiError, requireSameOrigin } from "@/lib/auth";
import {
  seedAccountRecords,
  MAX_DOCUMENT_BYTES,
  parseDocumentWrite,
} from "@/lib/workspace-document";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { db, workspaceId } = await authorize(request);
    const { data, error } = await db
      .from("workspace_drafts")
      .select("state,revision,updated_at")
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (error)
      throw new ApiError(
        503,
        "Workspace storage is unavailable. Ask your administrator to finish account setup.",
      );
    if (data)
      return NextResponse.json(data, {
        headers: { "Cache-Control": "no-store" },
      });
    const { data: workspace, error: workspaceError } = await db
      .from("workspaces")
      .select("name")
      .eq("id", workspaceId)
      .single();
    if (workspaceError)
      throw new ApiError(503, "Workspace could not be loaded.");
    const [contacts, campaigns] = await Promise.all([
      db
        .from("contacts")
        .select(
          "id,name,company,email,phone,stage,tags,consent,opted_out_at,created_at",
          { count: "exact" },
        )
        .eq("workspace_id", workspaceId)
        .order("id")
        .range(0, 9999),
      db
        .from("campaigns")
        .select("id,name,channel,created_at", { count: "exact" })
        .eq("workspace_id", workspaceId)
        .order("id")
        .range(0, 1999),
    ]);
    if (contacts.error || campaigns.error)
      throw new ApiError(
        503,
        "Earlier workspace records could not be loaded. No empty document was saved.",
      );
    if ((contacts.count || 0) > 10000 || (campaigns.count || 0) > 2000)
      throw new ApiError(
        413,
        "Earlier account records exceed the draft workspace limit. Review or export them in Account controls.",
      );
    // Hosted PostgREST may cap a range below the requested size. Fetch the
    // remaining pages explicitly instead of silently dropping old records.
    while (contacts.data.length < (contacts.count || 0)) {
      const next = await db
        .from("contacts")
        .select(
          "id,name,company,email,phone,stage,tags,consent,opted_out_at,created_at",
        )
        .eq("workspace_id", workspaceId)
        .order("id")
        .range(contacts.data.length, contacts.data.length + 499);
      if (next.error || !next.data?.length)
        throw new ApiError(
          503,
          "Contact records changed or could not be fully loaded. Reload before saving.",
        );
      contacts.data.push(...next.data);
    }
    while (campaigns.data.length < (campaigns.count || 0)) {
      const next = await db
        .from("campaigns")
        .select("id,name,channel,created_at")
        .eq("workspace_id", workspaceId)
        .order("id")
        .range(campaigns.data.length, campaigns.data.length + 499);
      if (next.error || !next.data?.length)
        throw new ApiError(
          503,
          "Campaign records changed or could not be fully loaded. Reload before saving.",
        );
      campaigns.data.push(...next.data);
    }
    return NextResponse.json(
      {
        state: seedAccountRecords(
          workspace.name,
          contacts.data || [],
          campaigns.data || [],
        ),
        revision: 0,
        updated_at: null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    requireSameOrigin(request);
    const { service, workspaceId, user } = await authorize(request, true);
    if (Number(request.headers.get("content-length")) > MAX_DOCUMENT_BYTES)
      throw new ApiError(413, "Workspace draft is too large.");
    // Bound chunked bodies too; do not buffer an unlimited request before validation.
    const reader = request.body?.getReader();
    if (!reader) throw new ApiError(400, "Workspace draft is required.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_DOCUMENT_BYTES) {
        await reader.cancel();
        throw new ApiError(413, "Workspace draft is too large.");
      }
      chunks.push(value);
    }
    let parsed;
    try {
      parsed = parseDocumentWrite(
        JSON.parse(Buffer.concat(chunks).toString("utf8")),
      );
    } catch {
      throw new ApiError(
        422,
        "Invalid workspace draft. Export a backup and review its fields.",
      );
    }
    const { data, error } = await service.rpc("save_workspace_draft", {
      w: workspaceId,
      actor: user.id,
      expected_revision: parsed.revision,
      draft_state: parsed.state,
    });
    if (error?.message.includes("draft_revision_conflict"))
      throw new ApiError(
        409,
        "Another tab or teammate changed this workspace. Export your unsaved work, then reload the latest version.",
      );
    if (error)
      throw new ApiError(
        503,
        "The draft could not be saved. Your unsaved changes remain on this screen for export.",
      );
    return NextResponse.json(
      { revision: Number(data) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
