import Link from "next/link";
import { ArrowUpRight, Users, GitBranch, MessageCircle } from "lucide-react";
import { PageHero, CTA } from "@/components/marketing/blocks";
export const metadata = { title: "Partner conversations — Sprint by Scalezix" };
export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="BUILDING CONNECTIONS, TOGETHER"
        title="Good partnerships start with a shared direction."
        description="Explore a future conversation about implementation, channel expertise, or helping businesses adopt a more connected sales workflow."
      />
      <section className="site-section site-container">
        <div className="site-about-values">
          {[
            {
              name: "Implementation expertise",
              text: "Help businesses map a useful sales process before connecting channels and activating outreach.",
              icon: GitBranch,
            },
            {
              name: "Channel understanding",
              text: "Bring experience in responsible messaging, customer support, and business communications.",
              icon: MessageCircle,
            },
            {
              name: "A thoughtful rollout",
              text: "Start with team needs, clear ownership, and verified workflows rather than promising instant results.",
              icon: Users,
            },
          ].map((x) => (
            <article key={x.name}>
              <span className="site-icon">
                <x.icon size={23} />
              </span>
              <h3>{x.name}</h3>
              <p>{x.text}</p>
            </article>
          ))}
        </div>
        <div className="site-note-box" style={{ marginTop: 30 }}>
          No active partner program, commission offer, or provider partnership
          is represented by this page. Agency multi-client management is outside
          the initial product scope.
        </div>
      </section>
      <CTA
        title="Have a complementary idea?"
        description="Prepare a partnership enquiry with your experience and the businesses you help."
      />
    </>
  );
}
