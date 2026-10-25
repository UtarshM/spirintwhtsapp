import type { CSSProperties } from 'react';
/** Shared sales-growth mark for product identity; channel icons stay independent. */
export default function SalesMark({size=24,style}:{size?:number;style?:CSSProperties}) {
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}><path d="m4 12 6-6 4 3 6-6M15 3h5v5M5 18v3M11 15v6M17 13v8"/></svg>;
}
