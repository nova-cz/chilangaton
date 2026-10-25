"use client";

import { Logo } from "@/components/brand/logo";
import { StationMap } from "@/components/map";
import { DemoBadge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import type { DemoDataset } from "@/features/demo/types";
import { cn } from "@/lib/cn";
import { useMediaQuery } from "@/lib/use-media-query";
import { Box, LayoutDashboard, List, Map as MapIcon, Target } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { BottomNav, type AppView } from "./bottom-nav";
import { MissionCard } from "./mission-card";
import { StationCard } from "./station-card";
import { StationList } from "./station-list";
import { StationSearch } from "./station-search";

/** Pantalla principal /app: mapa + búsqueda + tarjeta flotante + lista equivalente. */
export function AppExperience({ data }: { data: DemoDataset }) {
  const { stations, missions } = data;
  const [view, setView] = useState<AppView>("map");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view3d, setView3d] = useState(false);
  const [supports3d, setSupports3d] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const selected = stations.find((s) => s.id === selectedId) ?? null;
  const mission = missions[0];
  const showMap = view !== "list";

  const changeView = (next: AppView) => {
    setView(next);
    if (next === "missions") setSelectedId(null);
  };
  const pickStation = (id: string) => {
    setSelectedId(id);
    if (view === "missions") setView("map");
  };

  const sheetContent = selected ? (
    <StationCard station={selected} onClose={() => setSelectedId(null)} />
  ) : view === "missions" || (isDesktop && mission) ? (
    <div className="space-y-3">
      {mission ? <MissionCard mission={mission} stations={stations} onShowStation={pickStation} /> : null}
      <p className="px-1 text-sm text-ink-muted">
        Toca una estación en el mapa o búscala para ver bicis y anclajes. Todos los datos de esta pantalla son DEMO.
      </p>
    </div>
  ) : view === "map" ? (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="font-semibold">{stations.length} estaciones en el corredor</p>
        <p className="text-sm text-ink-muted">Toca un marcador para ver detalles</p>
      </div>
      {mission ? (
        <Button variant="soft" size="sm" onClick={() => changeView("missions")}>
          <Target aria-hidden className="size-4" />
          Misión
        </Button>
      ) : null}
    </div>
  ) : null;

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-surface">
      {/* Capa principal: mapa o lista */}
      {showMap ? (
        <div className="absolute inset-0">
          <StationMap
            stations={stations}
            selectedId={selectedId}
            onSelect={setSelectedId}
            view3d={view3d}
            on3dSupport={setSupports3d}
            focusOffset={isDesktop ? [210, 0] : [0, -190]}
            fitPadding={isDesktop ? { top: 110, bottom: 60, left: 470, right: 90 } : { top: 170, bottom: 230, left: 36, right: 72 }}
            errorAction={
              <Button variant="dark" size="sm" onClick={() => changeView("list")}>
                <List aria-hidden className="size-4" /> Ver lista
              </Button>
            }
          />
        </div>
      ) : (
        <div className="absolute inset-0 overflow-y-auto px-4 pt-[152px] pb-36 lg:pt-28 lg:pr-8 lg:pb-8 lg:pl-[468px]">
          <div className="mx-auto max-w-2xl">
            {!isDesktop && mission && !selected ? (
              <MissionCard className="mb-5" mission={mission} stations={stations} onShowStation={pickStation} />
            ) : null}
            <StationList stations={stations} selectedId={selectedId} onSelect={setSelectedId} />
          </div>
        </div>
      )}

      {/* Header + búsqueda */}
      <header className="pt-safe pointer-events-none absolute inset-x-0 top-0 z-20 px-3 lg:px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="pointer-events-auto w-full space-y-2.5 lg:w-[420px]">
            <div className="glass flex h-14 items-center justify-between rounded-full pr-2 pl-2.5">
              <Logo subtitle="Bicis útiles, a tiempo" />
              <div className="flex items-center gap-1.5">
                <DemoBadge />
                <Link href="/panel" className={buttonClasses("ghost", "icon", "size-10 lg:hidden")} aria-label="Ir al panel operativo">
                  <LayoutDashboard aria-hidden className="size-5" />
                </Link>
              </div>
            </div>
            <StationSearch stations={stations} onPick={pickStation} />
          </div>

          <div className="pointer-events-auto hidden items-center gap-2 lg:flex">
            <div className="glass rounded-full p-1">
              <Segmented
                label="Vista"
                value={view === "list" ? "list" : "map"}
                onChange={(v) => changeView(v)}
                options={[
                  { value: "map", label: "Mapa" },
                  { value: "list", label: "Lista" },
                ]}
              />
            </div>
            <Link href="/panel" className={buttonClasses("dark", "md")}>
              <LayoutDashboard aria-hidden className="size-4" /> Panel
            </Link>
          </div>
        </div>
      </header>

      {/* Control 2D / 3D */}
      {showMap ? (
        <div className="absolute top-[152px] right-3 z-10 flex flex-col gap-2 lg:top-24 lg:right-4">
          <Button
            variant="glass"
            size="icon"
            aria-pressed={view3d}
            disabled={!supports3d}
            onClick={() => setView3d((v) => !v)}
            title={supports3d ? "Alternar vista 3D (edificios de OpenStreetMap)" : "El estilo de mapa no trae alturas de edificios"}
            aria-label={view3d ? "Cambiar a vista 2D" : "Cambiar a vista 3D"}
            className={cn("text-xs font-bold", view3d && "bg-brand-900 text-white hover:bg-brand-700")}
          >
            {view3d ? <MapIcon aria-hidden className="size-5" /> : <Box aria-hidden className="size-5" />}
          </Button>
        </div>
      ) : null}

      {/* Bottom sheet (móvil) / panel lateral (escritorio) */}
      {sheetContent ? (
        <aside
          aria-label="Detalle"
          className={cn(
            "absolute inset-x-0 bottom-0 z-20 px-3 pb-[calc(max(env(safe-area-inset-bottom),0.75rem)+80px)]",
            "lg:inset-x-auto lg:top-[152px] lg:bottom-auto lg:left-4 lg:w-[420px] lg:px-0 lg:pb-0",
          )}
        >
          <div className="glass mx-auto max-h-[62dvh] max-w-md animate-sheet-in overflow-y-auto rounded-[var(--radius-sheet)] p-4 lg:max-h-[calc(100dvh-170px)] lg:max-w-none">
            <div aria-hidden className="mx-auto -mt-1 mb-3 h-1.5 w-10 rounded-full bg-ink/15 lg:hidden" />
            {sheetContent}
          </div>
        </aside>
      ) : null}

      <BottomNav view={view} onView={changeView} />
    </div>
  );
}
