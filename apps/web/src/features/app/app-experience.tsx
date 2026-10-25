"use client";

import { Logo } from "@/components/brand/logo";
import { StationMap } from "@/components/map";
import { DemoBadge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import type { DemoDataset } from "@/features/demo/types";
import { useMediaQuery } from "@/lib/use-media-query";
import { Box, LayoutDashboard, List, LocateFixed, Map as MapIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { BottomNav, type AppView } from "./bottom-nav";
import { BottomSheet, type SheetSnap } from "./bottom-sheet";
import { FilterChips, filterStations, type StationFilter } from "./filter-chips";
import { MapOverview } from "./map-overview";
import { MissionCard } from "./mission-card";
import { StationCard } from "./station-card";
import { StationList } from "./station-list";
import { StationSearch } from "./station-search";

/** Alto visible del bottom sheet en modo compacto (px). */
const PEEK = 250;

/** Pantalla principal /app: mapa 3D + búsqueda + filtros + bottom sheet + lista equivalente. */
export function AppExperience({ data }: { data: DemoDataset }) {
  const { stations: allStations, missions } = data;
  const [view, setView] = useState<AppView>("map");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view3d, setView3d] = useState(true);
  const [supports3d, setSupports3d] = useState(false);
  const [filter, setFilter] = useState<StationFilter>("all");
  const [snap, setSnap] = useState<SheetSnap>("compact");
  const [recenter, setRecenter] = useState(0);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const stations = filterStations(allStations, filter);
  const selected = stations.find((s) => s.id === selectedId) ?? null;
  const mission = missions[0];
  const showMap = view !== "list";

  const changeView = (next: AppView) => {
    setView(next);
    if (next === "missions") {
      setSelectedId(null);
      setSnap("expanded");
    } else {
      setSnap("compact");
    }
  };
  const pickStation = (id: string) => {
    setSelectedId(id);
    setSnap("compact");
    if (view === "missions") setView("map");
  };
  const clearSelection = () => {
    setSelectedId(null);
    setSnap("compact");
  };

  const overview = (
    <MapOverview
      stations={stations}
      onPick={pickStation}
      showList={isDesktop || snap === "expanded"}
      mission={mission ? { title: mission.title, onOpen: () => changeView("missions") } : undefined}
    />
  );
  const missionCard = mission ? (
    <MissionCard className="animate-rise" mission={mission} stations={allStations} onShowStation={pickStation} />
  ) : null;

  const panelContent = selected ? (
    <StationCard key={selected.id} station={selected} onClose={clearSelection} />
  ) : view === "missions" ? (
    missionCard
  ) : view === "map" || isDesktop ? (
    overview
  ) : null;

  const mapControls = (
    <>
      <Button
        variant="glass"
        size="md"
        aria-pressed={view3d}
        disabled={!supports3d}
        onClick={() => setView3d((v) => !v)}
        title={supports3d ? "Alternar vista 3D (edificios de OpenStreetMap)" : "El estilo de mapa no trae alturas de edificios"}
        aria-label={view3d ? "Cambiar a vista 2D" : "Cambiar a vista 3D"}
        className="px-4 font-bold"
      >
        {view3d ? <MapIcon aria-hidden className="size-4" /> : <Box aria-hidden className="size-4" />}
        {view3d ? "2D" : "3D"}
      </Button>
      <Button variant="glass" size="icon" aria-label="Encuadrar el corredor" onClick={() => setRecenter((n) => n + 1)}>
        <LocateFixed aria-hidden className="size-5" />
      </Button>
    </>
  );

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-surface">
      {/* Capa principal: mapa o lista */}
      {showMap ? (
        <div className="absolute inset-0">
          <StationMap
            stations={stations}
            selectedId={selected?.id ?? null}
            onSelect={(id) => (id ? pickStation(id) : clearSelection())}
            view3d={view3d}
            on3dSupport={setSupports3d}
            recenterSignal={recenter}
            focusOffset={isDesktop ? [210, 0] : [0, -85]}
            fitPadding={isDesktop ? { top: 120, bottom: 70, left: 470, right: 90 } : { top: 190, bottom: 340, left: 24, right: 24 }}
            errorAction={
              <Button variant="dark" size="sm" onClick={() => changeView("list")}>
                <List aria-hidden className="size-4" /> Ver lista
              </Button>
            }
          />
        </div>
      ) : (
        <div className="absolute inset-0 overflow-y-auto px-4 pt-[196px] pb-40 lg:pt-[196px] lg:pr-8 lg:pb-8 lg:pl-[468px]">
          <div key="list" className="mx-auto max-w-2xl animate-rise">
            <StationList stations={stations} selectedId={selected?.id ?? null} onSelect={pickStation} />
          </div>
        </div>
      )}

      {/* Cabecera: marca, búsqueda y filtros (una sola columna: nada se encima) */}
      <header className="pt-safe pointer-events-none absolute inset-x-0 top-0 z-30 px-3 lg:px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="pointer-events-auto w-full space-y-2.5 lg:w-[420px]">
            <div className="glass flex h-14 items-center justify-between rounded-full pr-1.5 pl-2.5">
              <Logo subtitle="Bicis útiles, a tiempo" />
              <div className="flex items-center gap-1.5">
                <DemoBadge />
                <Link
                  href="/panel"
                  className={buttonClasses("dark", "icon", "size-10 lg:hidden")}
                  aria-label="Ir al panel operativo"
                >
                  <LayoutDashboard aria-hidden className="size-[18px]" />
                </Link>
              </div>
            </div>
            <StationSearch stations={allStations} onPick={pickStation} />
            {view !== "missions" ? <FilterChips stations={allStations} value={filter} onChange={setFilter} /> : null}
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

      {/* Escritorio: controles del mapa arriba a la derecha y panel lateral */}
      {isDesktop ? (
        <>
          {showMap ? <div className="absolute top-24 right-4 z-10 flex gap-2">{mapControls}</div> : null}
          {panelContent ? (
            <aside aria-label="Detalle" className="absolute top-[212px] bottom-4 left-4 z-20 w-[420px]">
              <div
                key={`${view}-${selected?.id ?? "none"}`}
                className="opaque-pane max-h-full animate-sheet-in overflow-y-auto rounded-[var(--radius-sheet)] p-4"
              >
                {panelContent}
              </div>
            </aside>
          ) : null}
        </>
      ) : panelContent ? (
        <BottomSheet
          snap={snap}
          onSnap={setSnap}
          peek={PEEK}
          label="Detalle"
          controls={showMap ? mapControls : undefined}
        >
          <div key={`${view}-${selected?.id ?? "none"}`}>{panelContent}</div>
        </BottomSheet>
      ) : null}

      <BottomNav view={view} onView={changeView} />
    </div>
  );
}
