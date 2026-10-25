import { Card, CardHeader } from "@/components/ui/card";
import { PANEL_NAV } from "@/features/navigation/routes";
import { OverviewView } from "@/features/panel/overview-view";
import { cn } from "@/lib/cn";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Resumen" };

export default function PanelHome() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Resumen operativo</h1>
        <p className="mt-1 text-ink-muted">Vista general del corredor con los indicadores del contrato que mide la Línea 1.</p>
      </div>

      <OverviewView
        aside={
          <Card>
            <CardHeader title="Módulos del equipo" description="Cada sección se habilita cuando su línea la publica." />
            <ul className="space-y-1 px-3 pb-4">
              {PANEL_NAV.filter((item) => item.href !== "/panel").map(({ href, label, icon: Icon, owner, ready }) => (
                <li key={href}>
                  {ready ? (
                    <Link href={href} className="flex items-center gap-3 rounded-2xl p-2.5 hover:bg-ink/[0.03]">
                      <ModuleRow Icon={Icon} label={label} owner={owner} ready />
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 p-2.5">
                      <ModuleRow Icon={Icon} label={label} owner={owner} ready={false} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        }
      />
    </div>
  );
}

function ModuleRow({ Icon, label, owner, ready }: { Icon: React.ElementType; label: string; owner: string; ready: boolean }) {
  return (
    <>
      <span className="grid size-10 place-items-center rounded-2xl bg-brand-50 text-brand-700">
        <Icon aria-hidden className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-xs text-ink-muted">{owner}</span>
      </span>
      <span
        className={cn(
          "rounded-full px-2.5 py-1 text-[11px] font-semibold",
          ready ? "bg-brand-100 text-brand-900" : "bg-ink/5 text-ink-muted",
        )}
      >
        {ready ? "Disponible" : "En desarrollo"}
      </span>
    </>
  );
}
