import { redirect } from "next/navigation";
import { userDb, configured } from "@/lib/supabase";
import Account from "@/components/account";
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
  return (
    <Account
      email={user.email || ""}
      workspaceId={data?.[0]?.workspace_id}
      role={data?.[0]?.role}
    />
  );
}
