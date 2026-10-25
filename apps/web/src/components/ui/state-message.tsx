import { cn } from "@/lib/cn";
import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

type Kind = "loading" | "error" | "empty";

const ICONS = { loading: Loader2, error: AlertTriangle, empty: Inbox } as const;

/** Estados de carga, error y sin datos, con anuncio para lector de pantalla. */
export function StateMessage({
  kind,
  title,
  description,
  action,
  className,
}: {
  kind: Kind;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const Icon = ICONS[kind];
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      aria-live="polite"
      className={cn("flex flex-col items-center justify-center gap-3 px-6 py-10 text-center", className)}
    >
      <span
        className={cn(
          "grid size-12 place-items-center rounded-2xl",
          kind === "error" ? "bg-danger-100 text-danger-700" : "bg-brand-100 text-brand-700",
        )}
      >
        <Icon aria-hidden className={cn("size-6", kind === "loading" && "animate-spin")} />
      </span>
      <div className="max-w-sm">
        <p className="font-semibold text-ink">{title}</p>
        {description ? <p className="mt-1 text-sm text-ink-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-2xl bg-ink/[0.06]", className)} />;
}
