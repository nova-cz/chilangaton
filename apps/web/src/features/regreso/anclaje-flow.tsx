"use client";

import { Announce, speak, vibrate } from "@/components/shared/announce";
import { WIDE_BUTTON } from "@/components/shared/classes";
import { Semaforo } from "@/components/shared/semaforo";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StateMessage } from "@/components/ui/state-message";
import { normalize, type Tone } from "@/features/stations/status";
import { cn } from "@/lib/cn";
import { LocateFixed, MapPin, Search } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { bikesTotal, regresoApi, type ReturnCheck, type ReturnStatus, type StationOption } from "./api";
import { formatCdmxTime, helpHref } from "./channels";
import { stripZeros } from "./stations";

const POLL_MS = 10_000; // el feed se actualiza cada ~10 s
const GIVE_UP_AFTER_MS = 60_000; // si la API no responde un minuto después de la ventana, dejamos de insistir

type Catalog = { state: "loading" } | { state: "error" } | { state: "ready"; stations: StationOption[] };
type Final = Exclude<ReturnStatus, "revisando">;

const RESULT: Record<Final, { tone: Tone; label: string; card: string; body: string }> = {
  vemos_una_mas: {
    tone: "ok",
    label: "Buena señal",
    card: "bg-brand-100",
    body: "Que la estación sume una bici es buena señal, pero solo la app oficial de ECOBICI confirma que tu viaje terminó.",
  },
  sin_cambio: {
    tone: "warn",
    label: "Sin cambio",
    card: "bg-warning-100",
    body: "Puede ser retraso del sistema o que el anclaje no cerró. Si ya ves la luz verde, revisa la app oficial.",
  },
  no_responde: {
    tone: "danger",
    label: "Sin respuesta",
    card: "bg-danger-100",
    body: "No podemos saber si tu bici quedó anclada. Si la app oficial no confirma tu viaje, avisa a ECOBICI.",
  },
};

/** R2 · "Anclé aquí": elige estación, toca el botón y revisamos el feed real durante 3 minutos. */
export function AnclajeFlow() {
  const params = useSearchParams();
  const [catalog, setCatalog] = useState<Catalog>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [pickedId, setPickedId] = useState<string | null>(params.get("estacion"));
  const [check, setCheck] = useState<ReturnCheck | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [lost, setLost] = useState(false);
  const spoken = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    regresoApi
      .stations()
      .then((stations) => alive && setCatalog({ state: "ready", stations }))
      .catch(() => alive && setCatalog({ state: "error" }));
    return () => {
      alive = false;
    };
  }, [attempt]);

  useEffect(() => {
    if (!check || check.status !== "revisando") return;
    const timer = window.setTimeout(async () => {
      try {
        setCheck(await regresoApi.checkReturn(check.return_id));
        setOffline(false);
      } catch {
        setOffline(true);
        if (Date.now() > new Date(check.window_ends_at).getTime() + GIVE_UP_AFTER_MS) setLost(true);
        else setCheck({ ...check }); // reintenta en el siguiente ciclo
      }
    }, POLL_MS);
    return () => window.clearTimeout(timer);
  }, [check]);

  useEffect(() => {
    if (!check || check.status === "revisando" || spoken.current === check.return_id) return;
    spoken.current = check.return_id;
    vibrate();
    speak(check.message);
  }, [check]);

  const stations = catalog.state === "ready" ? catalog.stations : [];
  const station = stations.find((s) => s.station_id === pickedId) ?? null;

  const start = async () => {
    if (!station) return;
    setStarting(true);
    setStartError(null);
    setLost(false);
    try {
      setCheck(await regresoApi.startReturn(station.station_id));
    } catch {
      setStartError("No pudimos conectar con Equilibici. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setStarting(false);
    }
  };

  const reset = () => {
    setCheck(null);
    setLost(false);
    setPickedId(null);
  };

  if (catalog.state === "loading") return <StateMessage kind="loading" title="Cargando estaciones…" />;
  if (catalog.state === "error") {
    return (
      <StateMessage
        kind="error"
        title="No pudimos cargar las estaciones"
        description="Revisa tu conexión. Si el problema sigue, pide ayuda a ECOBICI."
        action={
          <Button
            variant="dark"
            onClick={() => {
              setCatalog({ state: "loading" });
              setAttempt((n) => n + 1);
            }}
          >
            Intentar de nuevo
          </Button>
        }
      />
    );
  }

  if (!station) return <StationPicker stations={stations} onPick={setPickedId} />;

  const help = (
    <Link href={helpHref({ kind: "anclaje", station: station.name })} className={cn(buttonClasses("soft"), WIDE_BUTTON)}>
      Pedir ayuda a ECOBICI
    </Link>
  );

  return (
    <div className="space-y-4">
      <Card className="animate-rise flex items-center gap-3 p-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-700">
          <MapPin aria-hidden className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-ink-muted">Estación</p>
          <p className="font-semibold">{station.name}</p>
        </div>
        {!check || check.status !== "revisando" ? (
          <Button variant="ghost" size="sm" onClick={reset}>
            Cambiar
          </Button>
        ) : null}
      </Card>

      {!check ? (
        <Card className="animate-rise space-y-3 p-5" style={{ animationDelay: "60ms" }}>
          <ol className="list-decimal space-y-1 pl-5 text-[15px]">
            <li>Empuja la bici en el anclaje hasta que suene y veas la luz verde.</li>
            <li>Toca «Anclé aquí». Revisamos la estación durante 3 minutos.</li>
          </ol>
          <Button variant="lime" className={WIDE_BUTTON} onClick={start} disabled={starting}>
            {starting ? "Revisando…" : "Anclé aquí"}
          </Button>
          {startError ? (
            <p role="alert" className="text-sm font-semibold text-danger-700">
              {startError}
            </p>
          ) : null}
        </Card>
      ) : lost ? (
        <StateMessage
          kind="error"
          title="No pudimos terminar la revisión"
          description="Perdimos la conexión. Revisa la app oficial de ECOBICI o pide ayuda."
          action={help}
        />
      ) : check.status === "revisando" ? (
        <Checking check={check} offline={offline} />
      ) : (
        <Result check={check} status={check.status} stationCode={station.code} onRetry={start} retrying={starting} help={help} />
      )}

      <Announce message={check ? check.message : ""} />
    </div>
  );
}

function Checking({ check, offline }: { check: ReturnCheck; offline: boolean }) {
  const before = bikesTotal(check.baseline);
  return (
    <Card className="animate-rise p-5">
      <StateMessage
        kind="loading"
        title={check.message}
        description={`Revisamos hasta las ${formatCdmxTime(new Date(check.window_ends_at))}; puedes dejar esta pantalla abierta.`}
        className="py-4"
      />
      {before !== null ? (
        <p className="text-center text-sm text-ink-muted">
          Al anclar, la estación tenía {before} {before === 1 ? "bici" : "bicis"}.
        </p>
      ) : null}
      {offline ? <p className="mt-2 text-center text-sm font-semibold text-warning-700">Sin conexión, reintentando…</p> : null}
    </Card>
  );
}

function Result({
  check,
  status,
  stationCode,
  onRetry,
  retrying,
  help,
}: {
  check: ReturnCheck;
  status: Final;
  stationCode: string;
  onRetry: () => void;
  retrying: boolean;
  help: ReactNode;
}) {
  const copy = RESULT[status];
  const before = bikesTotal(check.baseline);
  const now = bikesTotal(check.latest);
  return (
    <Card className={cn("animate-pop space-y-3 border-transparent p-5", copy.card)}>
      <Semaforo tone={copy.tone} label={copy.label} className={copy.tone === "ok" ? "text-brand-700" : undefined} />
      <h2 className="text-xl font-bold tracking-tight">{check.message}</h2>
      <p className="text-[15px] text-ink">{copy.body}</p>
      {before !== null && now !== null && check.latest ? (
        <p className="text-sm text-ink-muted">
          Al anclar: {before} · Ahora: {now} bicis · dato de las {formatCdmxTime(new Date(check.latest.observed_at))}
        </p>
      ) : null}
      <div className="grid gap-2 pt-1">
        {status === "vemos_una_mas" ? (
          <Link href="/app" className={cn(buttonClasses("dark"), WIDE_BUTTON)}>
            Listo
          </Link>
        ) : (
          <>
            <Button variant="lime" className={WIDE_BUTTON} onClick={onRetry} disabled={retrying}>
              {status === "sin_cambio" ? "Ya volví a empujar: revisar otra vez" : "Revisar otra vez"}
            </Button>
            {help}
            <ReportForReview check={check} stationCode={stationCode} />
          </>
        )}
      </div>
    </Card>
  );
}

/** Abre un caso "anclaje" con esta verificación como evidencia y avisa al taller de la Línea 2 (C4). */
function ReportForReview({ check, stationCode }: { check: ReturnCheck; stationCode: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const send = async () => {
    setState("sending");
    try {
      await regresoApi.openIncident({
        type: "anclaje",
        source: "app",
        station_id: check.station_id,
        return_id: check.return_id,
      });
      // C4 pide el código CE. Si el taller no responde, el caso ya quedó abierto: no se bloquea.
      regresoApi.reportToTaller({ station_id: stripZeros(stationCode), type: "anclaje", source: "usuario" }).catch(() => {});
      setState("sent");
    } catch {
      setState("error");
    }
  };
  if (state === "sent") {
    return (
      <p role="status" className="text-sm font-semibold text-ink">
        Listo: un Guardián de Equilibici lo revisará. Esto no sustituye tu reporte a ECOBICI.
      </p>
    );
  }
  return (
    <>
      <Button variant="ghost" className={WIDE_BUTTON} onClick={send} disabled={state === "sending"}>
        {state === "sending" ? "Enviando…" : "Pedir que un Guardián lo revise"}
      </Button>
      {state === "error" ? (
        <p role="alert" className="text-sm font-semibold text-danger-700">
          No se pudo enviar. Intenta de nuevo.
        </p>
      ) : null}
    </>
  );
}

function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

function formatDistance(km: number): string {
  return km < 1 ? `a ${Math.round((km * 1000) / 10) * 10} m` : `a ${km.toFixed(1)} km`;
}

/** Búsqueda por nombre o número y, si la persona lo permite, las más cercanas. La ubicación no sale del teléfono. */
function StationPicker({ stations, onPick }: { stations: StationOption[]; onPick: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [here, setHere] = useState<{ lat: number; lon: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const inputId = useId();

  const results = useMemo(() => {
    const q = normalize(query);
    if (q) {
      // "14", "014" o "CE-014" ponen primero la estación con ese número; luego las que lo contienen en el nombre.
      // El catálogo trae códigos con ceros ("014") y dobles ("264-275"): se comparan sin ceros a la izquierda.
      const code = stripZeros(q.replace(/^ce-?/, ""));
      return stations
        .map((s) => ({ s, rank: stripZeros(s.code) === code ? 0 : normalize(s.name).includes(q) ? 1 : 2 }))
        .filter((r) => r.rank < 2)
        .sort((a, b) => a.rank - b.rank)
        .slice(0, 8)
        .map(({ s }) => ({ station: s, km: here ? distanceKm(here, s) : null }));
    }
    if (here) {
      return stations
        .map((s) => ({ station: s, km: distanceKm(here, s) }))
        .sort((a, b) => a.km - b.km)
        .slice(0, 5);
    }
    return [];
  }, [stations, query, here]);

  const locate = () => {
    if (!("geolocation" in navigator)) {
      setLocError("Tu navegador no comparte ubicación. Busca la estación por nombre o número.");
      return;
    }
    setLocating(true);
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setHere({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocError("No pudimos usar tu ubicación. Busca la estación por nombre o número.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  return (
    <Card className="animate-rise space-y-4 p-5">
      <div>
        <h2 className="font-semibold">¿En qué estación anclaste?</h2>
        <p className="mt-0.5 text-sm text-ink-muted">Usa tu ubicación o búscala.</p>
      </div>
      <Button variant="dark" className={WIDE_BUTTON} onClick={locate} disabled={locating}>
        <LocateFixed aria-hidden className="size-4" />
        {locating ? "Buscando…" : "Usar mi ubicación"}
      </Button>
      {locError ? (
        <p role="alert" className="text-sm text-warning-700">
          {locError}
        </p>
      ) : null}
      <div>
        <label htmlFor={inputId} className="text-sm font-semibold">
          Buscar estación
        </label>
        <div className="relative mt-1">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-soft" />
          <input
            id={inputId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ej. 14 o Reforma"
            autoComplete="off"
            className="h-11 w-full rounded-2xl border border-line bg-white pr-4 pl-10 text-[15px] text-ink placeholder:text-ink-soft focus-visible:border-brand-500"
          />
        </div>
      </div>

      {results.length > 0 ? (
        <ul aria-label={query ? "Resultados de búsqueda" : "Estaciones cercanas"} className="space-y-2">
          {results.map(({ station, km }) => (
            <li key={station.station_id}>
              <button
                type="button"
                onClick={() => onPick(station.station_id)}
                className="flex min-h-11 w-full items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-left hover:bg-brand-50"
              >
                <MapPin aria-hidden className="size-4 shrink-0 text-brand-600" />
                <span className="min-w-0 flex-1 font-semibold">{station.name}</span>
                {km !== null ? <span className="shrink-0 text-sm text-ink-muted">{formatDistance(km)}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : query ? (
        <p role="status" className="text-sm text-ink-muted">
          No encontramos esa estación. Prueba con otra parte del nombre o con su número.
        </p>
      ) : null}
    </Card>
  );
}
