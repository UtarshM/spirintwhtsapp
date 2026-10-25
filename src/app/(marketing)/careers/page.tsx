import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHero, CTA } from "@/components/marketing/blocks";
export const metadata = { title: "Careers — Sprint by Scalezix" };
export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="BUILDING THE NEXT CHAPTER"
        title="Thoughtful products start with thoughtful people."
        description="Sprint is being developed under Scalezix, with a focus on clear interfaces, connected workflows, and careful execution."
      />
      <section className="site-section site-container">
        <div className="site-empty-state">
          <h3>No open roles listed yet.</h3>
          <p>
            We aren’t publishing or accepting applications through this preview.
            Future openings will include the role, expectations, location, and a
            verified application process.
          </p>
          <Link
            className="site-text-link"
            style={{ marginTop: 25 }}
            href="/about"
          >
            Get to know Sprint <ArrowUpRight size={14} />
          </Link>
        </div>
      </section>
      <CTA
        title="Curious about what we’re building?"
        description="Explore the product direction and the work ahead."
      />
    </>
  );
}
