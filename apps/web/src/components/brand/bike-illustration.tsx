import { cn } from "@/lib/cn";

/** Ilustración propia de bici (vectorial, sin fotos ni marcas de terceros). */
export function BikeIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 150" aria-hidden className={cn("w-full", className)}>
      <ellipse cx="120" cy="132" rx="104" ry="12" className="fill-brand-900/10" />
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="62" cy="98" r="34" strokeWidth="9" className="stroke-brand-900" />
        <circle cx="62" cy="98" r="22" strokeWidth="2" className="stroke-brand-900/30" />
        <circle cx="178" cy="98" r="34" strokeWidth="9" className="stroke-brand-900" />
        <circle cx="178" cy="98" r="22" strokeWidth="2" className="stroke-brand-900/30" />
        <path d="M62 98 L100 46 L158 46 L178 98" strokeWidth="9" className="stroke-brand-500" />
        <path d="M100 46 L120 98 L158 46" strokeWidth="9" className="stroke-brand-500" />
        <path d="M62 98 L120 98" strokeWidth="7" className="stroke-brand-700" />
        <path d="M94 34 L112 34" strokeWidth="9" className="stroke-brand-900" />
        <path d="M100 46 L96 34" strokeWidth="6" className="stroke-brand-900" />
        <path d="M158 46 L152 24 L170 20" strokeWidth="6" className="stroke-brand-900" />
      </g>
      <circle cx="120" cy="98" r="8" className="fill-lime-300 stroke-brand-900" strokeWidth="3" />
      <circle cx="62" cy="98" r="5" className="fill-brand-900" />
      <circle cx="178" cy="98" r="5" className="fill-brand-900" />
    </svg>
  );
}
