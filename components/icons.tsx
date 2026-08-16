import type { SVGProps } from "react";

const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function ArrowRight(p: SVGProps<SVGSVGElement>) {
  return (<svg {...base} {...p}><path d="M5 12h14" /><path d="m13 5 7 7-7 7" /></svg>);
}
export function ChevronLeft(p: SVGProps<SVGSVGElement>) {
  return (<svg {...base} {...p}><path d="m15 18-6-6 6-6" /></svg>);
}
export function ChevronRight(p: SVGProps<SVGSVGElement>) {
  return (<svg {...base} {...p}><path d="m9 18 6-6-6-6" /></svg>);
}
export function Close(p: SVGProps<SVGSVGElement>) {
  return (<svg {...base} {...p}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>);
}
export function Menu(p: SVGProps<SVGSVGElement>) {
  return (<svg {...base} {...p}><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></svg>);
}
export function CalendarIcon(p: SVGProps<SVGSVGElement>) {
  return (<svg {...base} {...p}><rect x={3} y={4} width={18} height={18} rx={2} /><path d="M16 2v4M8 2v4M3 10h18" /></svg>);
}
export function Clock(p: SVGProps<SVGSVGElement>) {
  return (<svg {...base} {...p}><circle cx={12} cy={12} r={9} /><path d="M12 7v5l3 3" /></svg>);
}
export function Star(p: SVGProps<SVGSVGElement>) {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
      <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
    </svg>
  );
}
export function ChevronDown(p: SVGProps<SVGSVGElement>) {
  return (<svg {...base} {...p}><path d="m6 9 6 6 6-6" /></svg>);
}
export function Check(p: SVGProps<SVGSVGElement>) {
  return (<svg {...base} {...p}><path d="M20 6 9 17l-5-5" /></svg>);
}
export function Phone(p: SVGProps<SVGSVGElement>) {
  return (<svg {...base} {...p}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg>);
}
export function Spinner(p: SVGProps<SVGSVGElement>) {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden="true"
      className="animate-[spin_0.8s_linear_infinite]" {...p}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
export function Eye(p: SVGProps<SVGSVGElement>) {
  return (<svg {...base} {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>);
}
export function Minus(p: SVGProps<SVGSVGElement>) {
  return (<svg {...base} {...p}><path d="M5 12h14" /></svg>);
}
export function Plus(p: SVGProps<SVGSVGElement>) {
  return (<svg {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>);
}
export function WhatsApp(p: SVGProps<SVGSVGElement>) {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
      <path d="M17.5 14.4c-.3-.15-1.7-.84-1.96-.94-.26-.1-.45-.15-.64.15-.19.29-.74.94-.9 1.13-.17.19-.33.21-.62.07-.29-.15-1.22-.45-2.33-1.44-.86-.77-1.44-1.72-1.6-2.01-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.51.15-.17.19-.29.29-.48.1-.19.05-.36-.02-.51-.07-.15-.64-1.55-.88-2.12-.23-.55-.47-.48-.64-.49l-.55-.01c-.19 0-.5.07-.76.36-.26.29-1 .98-1 2.38s1.02 2.76 1.17 2.95c.15.19 2.01 3.07 4.88 4.31.68.29 1.21.47 1.63.6.68.22 1.31.19 1.8.11.55-.08 1.7-.69 1.94-1.36.24-.67.24-1.24.17-1.36-.07-.12-.26-.19-.55-.34zM12.05 21.5A9.4 9.4 0 0 1 7.26 20.2l-.34-.2-3.56.93.95-3.47-.22-.36a9.38 9.38 0 0 1-1.44-5.01c0-5.18 4.22-9.4 9.41-9.4 2.51 0 4.87.98 6.64 2.76a9.34 9.34 0 0 1 2.75 6.65c0 5.18-4.22 9.4-9.4 9.4z" />
    </svg>
  );
}

/* Iconos de ventajas / productos */
export function IconByName({ name, ...p }: { name: string } & SVGProps<SVGSVGElement>) {
  switch (name) {
    case "shield": return (<svg {...base} {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>);
    case "compare": return (<svg {...base} {...p}><path d="M16 3h5v5" /><path d="M8 21H3v-5" /><path d="M21 3 3 21" /></svg>);
    case "doc": return (<svg {...base} {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M9 13h6M9 17h4" /></svg>);
    case "pin": return (<svg {...base} {...p}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></svg>);
    case "life": return (<svg {...base} {...p}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.5 1-1a5.5 5.5 0 0 0 0-7.9z" /></svg>);
    case "flower": return (<svg {...base} {...p}><circle cx="12" cy="12" r="3" /><path d="M12 9V2M12 22v-7M9 12H2M22 12h-7" /></svg>);
    case "home": return (<svg {...base} {...p}><path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 21v-6h6v6" /></svg>);
    case "car": return (<svg {...base} {...p}><path d="M5 13 6.5 7.5A2 2 0 0 1 8.4 6h7.2a2 2 0 0 1 1.9 1.5L19 13" /><path d="M3 13h18v5H3z" /><circle cx="7.5" cy="18.5" r="1.5" /><circle cx="16.5" cy="18.5" r="1.5" /></svg>);
    case "gift": return (<svg {...base} {...p}><path d="M20 12v10H4V12" /><path d="M2 7h20v5H2z" /><path d="M12 22V7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg>);
    case "chat": return (<svg {...base} {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>);
    default: return (<svg {...base} {...p}><circle cx="12" cy="12" r="9" /></svg>);
  }
}
