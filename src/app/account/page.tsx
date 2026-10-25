import { redirect } from "next/navigation";
import { userDb, configured } from "@/lib/supabase";
import Account from "@/components/account";
export default async function Page() {
  if (!configured())
    return (
      <div className="auth-shell">
        <section className="auth-card">
          <h1>Connect your workspace.</h1>
          <p>
            Add Supabase environment variables and apply the database migration
            to enable secure accounts.
          </p>
          <a className="primary" href="/">
            Return to sample workspace
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
