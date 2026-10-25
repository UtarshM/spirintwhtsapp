import { redirect } from 'next/navigation';
import Link from 'next/link';
import { configured, userDb } from '@/lib/supabase';
import VerificationFlow from '@/components/marketing/verification-flow';
import '../../marketing.css';
export const dynamic='force-dynamic';
export const metadata={title:'WhatsApp verification setup — Sprint'};
export default async function Page(){
 if(!configured()) redirect('/login');
 const db=await userDb();
 const {data:{user},error}=await db.auth.getUser();
 if(error||!user) redirect('/login');
 const {data:membership,error:membershipError}=await db.from('memberships').select('workspace_id').eq('user_id',user.id).limit(1).maybeSingle();
 if(membershipError||!membership) redirect('/account');
 return <div className="site-wrapper"><div className="site-container" style={{paddingTop:32,paddingBottom:40}}><Link className="site-text-link" href="/account">← Back to your account</Link><h1 style={{marginTop:24}}>WhatsApp verification setup</h1><p>Account workspace · Preparation tools. Live Meta submission is not connected yet.</p><VerificationFlow draftScope={`${user.id}:${membership.workspace_id}`}/></div></div>;
}
