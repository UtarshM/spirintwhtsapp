import Link from "next/link";
import SalesMark from "@/components/sales-mark";
import { ArrowLeft, ArrowRight } from "lucide-react";
export default function NotFound() {
  return (
    <div className="auth-shell">
      <section className="auth-card">
        <a className="brand" href="/">
          <span className="brand-icon">
            <SalesMark size={25} />
          </span>
          sprint.
        </a>
        <span className="eyebrow">404 · A DIFFERENT NEXT STEP</span>
        <h1>This page isn’t here.</h1>
        <p>
          The link may have changed, or this chapter hasn’t been written yet.
          Let’s get you back to a useful starting point.
        </p>
        <div className="button-group" style={{ justifyContent: "flex-start" }}>
          <Link href="/" className="primary">
            <ArrowLeft size={14} />
            Back to Sprint
          </Link>
          <Link href="/help" className="secondary">
            Find a guide <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </div>
  );
}
