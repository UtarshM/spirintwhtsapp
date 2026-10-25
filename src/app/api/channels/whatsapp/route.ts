import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, apiError, ApiError, requireSameOrigin } from "@/lib/auth";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const { db, workspaceId, user } = await authorize(request);
    const url = new URL(request.url),
      id = url.searchParams.get("conversation");
    if (id && !z.uuid().safeParse(id).success)
      throw new ApiError(400, "Invalid conversation.");
    const page = Math.min(
      10000,
      Math.max(1, Math.trunc(Number(url.searchParams.get("page"))) || 1),
    );
    const [conversations, integration, members] = await Promise.all([
      db
        .from("conversations")
        .select("id,contact_id,status,assigned_to,last_inbound_at,created_at", {
          count: "exact",
        })
        .eq("workspace_id", workspaceId)
        .eq("channel", "whatsapp")
        .order("last_inbound_at", { ascending: false, nullsFirst: false })
        .order("id")
        .range((page - 1) * 25, page * 25 - 1),
      db
        .from("integrations")
        .select("status,external_id")
        .eq("workspace_id", workspaceId)
        .eq("provider", "meta")
        .maybeSingle(),
      db
        .from("memberships")
        .select("user_id,role")
        .eq("workspace_id", workspaceId),
    ]);
    if (conversations.error || integration.error || members.error)
      throw new ApiError(
        503,
        "Provider conversation records could not be loaded. Check workspace setup.",
      );
    const contacts = conversations.data.length
      ? await db
          .from("contacts")
          .select("id,name,phone,consent,opted_out_at")
          .eq("workspace_id", workspaceId)
          .in(
            "id",
            conversations.data.map((c) => c.contact_id),
          )
      : { data: [], error: null };
    if (contacts.error)
      throw new ApiError(503, "Conversation contacts could not be loaded.");
    let messages: unknown[] = [],
      timeline: unknown[] = [],
      hasOlder = false;
    if (id) {
      const { data: selected, error } = await db
        .from("conversations")
        .select("id,contact_id")
        .eq("workspace_id", workspaceId)
        .eq("channel", "whatsapp")
        .eq("id", id)
        .maybeSingle();
      if (error || !selected)
        throw new ApiError(404, "Conversation not found.");
      const before = url.searchParams.get("before");
      const beforeId = url.searchParams.get("beforeId");
      if (before && !z.iso.datetime({ offset: true }).safeParse(before).success)
        throw new ApiError(400, "Invalid message cursor.");
      let query = db
        .from("messages")
        .select(
          "id,direction,body,status,provider_id,created_at,message_type,media_reference,provider_status_at",
        )
        .eq("workspace_id", workspaceId)
        .eq("conversation_id", id)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(101);
      if (before && (!beforeId || !z.uuid().safeParse(beforeId).success))
        throw new ApiError(400, "Invalid message cursor.");
      if (before)
        query = query.or(
          `created_at.lt.${before},and(created_at.eq.${before},id.lt.${beforeId})`,
        );
      const [messageResult, activityResult] = await Promise.all([
        query,
        db
          .from("activity_events")
          .select("id,kind,payload,created_at")
          .eq("workspace_id", workspaceId)
          .eq("contact_id", selected.contact_id)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);
      if (messageResult.error || activityResult.error)
        throw new ApiError(503, "Conversation history could not be loaded.");
      hasOlder = messageResult.data.length > 100;
      messages = messageResult.data.slice(0, 100).reverse();
      timeline = activityResult.data;
    }
    return NextResponse.json(
      {
        conversations: conversations.data.map((c) => ({
          ...c,
          contact: contacts.data.find((contact) => contact.id === c.contact_id),
        })),
        total: conversations.count,
        page,
        messages,
        timeline,
        hasOlder,
        integration: integration.data,
        members: members.data.map((m) => ({
          ...m,
          label:
            m.user_id === user.id
              ? user.email || "You"
              : `${m.role} · ${m.user_id.slice(0, 8)}`,
        })),
        currentUserId: user.id,
        liveSendingEnabled: false,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function PATCH(request: Request) {
  try {
    requireSameOrigin(request);
    const { db, service, workspaceId, user, role } = await authorize(request);
    const parsed = z
      .object({
        conversationId: z.uuid(),
        assignedTo: z.uuid().nullable(),
        status: z.enum(["open", "closed"]),
      })
      .strict()
      .safeParse(await request.json());
    if (!parsed.success)
      throw new ApiError(422, "Invalid conversation update.");
    if (["owner", "administrator"].includes(role)) {
      const { data } = await db.auth.mfa.getAuthenticatorAssuranceLevel();
      if (data?.currentLevel !== "aal2")
        throw new ApiError(
          403,
          "Verify your administrator authenticator first.",
        );
    }
    const { error } = await service.rpc("manage_provider_conversation", {
      w: workspaceId,
      conversation_uuid: parsed.data.conversationId,
      actor: user.id,
      assignee: parsed.data.assignedTo,
      next_status: parsed.data.status,
    });
    if (error?.message.includes("conversation_access_denied"))
      throw new ApiError(
        403,
        "You can only claim unassigned conversations or manage your own assignment.",
      );
    if (error)
      throw new ApiError(
        400,
        "Conversation could not be updated. Check assignment and membership.",
      );
    return NextResponse.json({ saved: true });
  } catch (error) {
    return apiError(error);
  }
}
