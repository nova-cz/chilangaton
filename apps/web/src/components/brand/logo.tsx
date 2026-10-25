import { cn } from "@/lib/cn";

/** Marca propia de Equilibici (no usa el logotipo de ECOBICI). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" aria-hidden className={cn("size-9", className)}>
      <rect width="512" height="512" rx="120" fill="#063F2E" />
      <circle cx="172" cy="290" r="78" fill="none" stroke="#DDF3E4" strokeWidth="30" />
      <circle cx="340" cy="290" r="78" fill="none" stroke="#22C470" strokeWidth="30" />
      <path
        d="M172 290 L236 178 L300 178 L340 290"
        fill="none"
        stroke="#DDF3E4"
        strokeWidth="26"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="256" cy="290" r="16" fill="#DDF3E4" />
    </svg>
  );
}

export function Logo({ className, subtitle }: { className?: string; subtitle?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="leading-tight">
        <span className="block text-[17px] font-bold tracking-tight text-ink">Equilibici</span>
        {subtitle ? <span className="block text-xs font-medium text-ink-muted">{subtitle}</span> : null}
      </span>
    </span>
  );
}
