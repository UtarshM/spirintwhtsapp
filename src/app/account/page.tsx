import { redirect } from "next/navigation";
import { userDb, configured } from "@/lib/supabase";
import Account from "@/components/account";
import Console from "@/components/console";
import "../dashboard/console.css";
export const dynamic = "force-dynamic";
export default async function Page() {
  if (!configured())
    return (
      <div className="auth-shell">
        <section className="auth-card">
          <h1>Connect your workspace.</h1>
          <p>
            Account access is not available yet. Your administrator needs to
            finish workspace setup before you can sign in.
          </p>
          <a className="primary" href="/dashboard">
            Preview all workspace modules
          </a>
        </section>
      </div>
    );
  const db = await userDb();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await db
    .from("memberships")
    .select("workspace_id,role")
    .eq("user_id", user.id)
    .limit(1);
  if (!data?.[0]?.workspace_id) return <Account email={user.email || ""} />;
  const workspaceId = data[0].workspace_id;
  const { data: workspace } = await db
    .from("workspaces")
    .select("name")
    .eq("id", workspaceId)
    .single();
  const { data: assurance } =
    await db.auth.mfa.getAuthenticatorAssuranceLevel();
  return (
    <Console
      account={{
        email: user.email || "",
        userId: user.id,
        workspaceId,
        name: workspace?.name || "My workspace",
        role: data[0].role,
        canEdit:
          ["owner", "administrator"].includes(data[0].role) &&
          (assurance?.nextLevel !== "aal2" ||
            assurance?.currentLevel === "aal2"),
      }}
    />
  );
}
