import Link from 'next/link';
import { PageHero } from '@/components/marketing/blocks';
export const metadata = { title: 'WhatsApp blue tick verification assistance — Sprint' };
export default function Page() {
  return <>
    <PageHero eyebrow="WHATSAPP VERIFICATION ASSISTANCE" title="Prepare your business for a verified badge." description="A clear path to understand your options, prepare your business details, and continue through Meta’s official tools."/>
    <section className="site-section site-container" style={{paddingTop:0}}>
      <div className="site-note-box"><strong>Approval belongs to Meta.</strong><p>Sprint provides preparation guidance. We cannot issue a blue tick, guarantee approval, or confirm your eligibility. This preview does not connect your account, submit applications, or collect verification documents.</p></div>
      <div className="site-note-box"><h2>Manage verification in your account</h2><p>Sign in to access the setup steps and application draft for your workspace.</p><Link className="site-button" href="/account/whatsapp-verification">Sign in to manage verification</Link></div>
      <div className="site-benefit-grid" style={{margin:'32px 0'}}>
        <article><h2>Business Platform accounts</h2><p>If you use the WhatsApp Business Platform, review the account and verification options available in WhatsApp Manager. Official Business Account review is separate from verifying your business details. Available application paths and requirements must be checked for your account.</p><a className="site-text-link" href="https://business.facebook.com/wa/manage/home/" target="_blank" rel="noopener noreferrer">Open WhatsApp Manager ↗</a></article>
        <article><h2>Meta Verified</h2><p>Meta Verified is a paid subscription with a verified badge and other benefits. Availability and requirements depend on your account. Review the offer in Meta’s official tools; a Sprint subscription does not include or activate Meta Verified.</p><a className="site-text-link" href="https://faq.whatsapp.com/3872729742954601" target="_blank" rel="noopener noreferrer">Read WhatsApp’s Meta Verified guide ↗</a></article>
        <article><h2>Keep your business in control</h2><p>Submit sensitive documents and any subscription payments only through the official Meta process. Do not share passwords, one-time codes, or API keys with someone offering a guaranteed badge.</p><a className="site-text-link" href="https://faq.whatsapp.com/794517045178057" target="_blank" rel="noopener noreferrer">About verified business accounts ↗</a></article>
      </div>
      <div className="site-button-row" style={{marginTop:28}}><Link className="site-button" href="/contact?topic=whatsapp-verification">Discuss verification assistance</Link><Link className="site-button outline" href="/dashboard">Back to workspace preview</Link></div>
      <p style={{marginTop:16}}>The enquiry form saves a local draft only. Account connection, application tracking, and support submission will be added during the integration phase.</p>
    </section>
  </>;
}
