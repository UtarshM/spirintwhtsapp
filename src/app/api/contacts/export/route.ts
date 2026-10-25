import { authorize, apiError, checkDb } from "@/lib/auth";
function cell(value: unknown) {
  let s = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
export async function GET(request: Request) {
  try {
    const { db, service, workspaceId, user } = await authorize(request, true);
    const { data, error } = await db
      .from("contacts")
      .select("name,company,email,phone,stage")
      .eq("workspace_id", workspaceId)
      .limit(10000);
    checkDb(error);
    await service
      .from("audit_events")
      .insert({
        workspace_id: workspaceId,
        actor_id: user.id,
        action: "contacts.export",
      });
    const csv = [
      ["Name", "Company", "Email", "Phone", "Stage"],
      ...(data || []).map((c) => [
        c.name,
        c.company,
        c.email,
        c.phone,
        c.stage,
      ]),
    ]
      .map((r) => r.map(cell).join(","))
      .join("\r\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="contacts.csv"',
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return apiError(e);
  }
}
