'use client';
import { useState } from 'react';
const items = [
  'I manage the business and its WhatsApp number, or have authorization from its owner.',
  'The business name, website, and contact details are consistent and current.',
  'I can access the relevant WhatsApp Business account and Meta business tools.',
  'I have reviewed the verification options and requirements shown by Meta for this account.',
  'I understand that Meta decides approval and may charge separately for a subscription.',
];
export default function VerificationChecklist() {
  const [checked, setChecked] = useState<number[]>([]);
  return <section className="site-note-box" aria-labelledby="verification-checklist-title">
    <h2 id="verification-checklist-title">Prepare for verification</h2>
    <p>Use this checklist to prepare. No documents are uploaded and no application is submitted here. Your selections reset when you leave this page.</p>
    <div style={{marginTop:20}}>{items.map((item,i)=><label className="checkbox-label" key={item} style={{fontSize:15,alignItems:'flex-start',lineHeight:1.6}}><input type="checkbox" checked={checked.includes(i)} onChange={e=>setChecked(current=>e.target.checked?[...current,i]:current.filter(n=>n!==i))}/><span>{item}</span></label>)}</div>
    <p role="status" aria-live="polite"><strong>{checked.length} of {items.length} preparation items reviewed.</strong> {checked.length===items.length?'You can now review the next steps in Meta’s tools. This does not confirm eligibility or approval.':'This is a preparation checklist, not an eligibility assessment.'}</p>
  </section>;
}
