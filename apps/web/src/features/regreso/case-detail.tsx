"use client";

import { Badge, SimulatedBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ApiError } from "@/lib/api";
import { useId, useState } from "react";
import { regresoApi, type Actor, type BikeState, type Case } from "./api";
import { ACTOR_LABEL, MOVE_LABEL, STATE_LABEL, STATE_TONE, TYPE_LABEL } from "./case-labels";
import { formatCdmx } from "./channels";

const INPUT =
  "h-11 w-full rounded-2xl border border-line bg-white px-4 text-[15px] text-ink placeholder:text-ink-soft focus-visible:border-brand-500";

/** Ficha del caso: datos, historial y acciones. Solo un Guardián o el operador mueven el caso. */
export function CaseDetail({
  item,
  stationName,
  actor,
  onChange,
}: {
  item: Case;
  stationName: string | null;
  actor: Actor;
  onChange: (next: Case) => void;
}) {
  const [note, setNote] = useState("");
  const [guardian, setGuardian] = useState(item.assigned_to ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ids = { note: useId(), guardian: useId() };

  const run = async (action: () => Promise<Case>) => {
    setBusy(true);
    setError(null);
    try {
      onChange(await action());
      setNote("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo guardar. Revisa la conexión.");
    } finally {
      setBusy(false);
    }
  };

  const move = (to: BikeState) =>
    run(() => regresoApi.transition(item.case_id, { to_state: to, actor, note: note.trim() || undefined }));
  const assign = () => run(() => regresoApi.assign(item.case_id, { guardian_id: guardian.trim(), actor }));

  return (
    <Card className="animate-rise space-y-5 p-5" aria-labelledby={`case-${item.case_id}`}>
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={STATE_TONE[item.state]}>{STATE_LABEL[item.state]}</Badge>
          {!item.is_open ? <Badge tone="neutral">Cerrado</Badge> : null}
          {item.simulated ? <SimulatedBadge /> : null}
        </div>
        <h2 id={`case-${item.case_id}`} className="text-xl font-bold tracking-tight">
          {TYPE_LABEL[item.type]}
        </h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-ink-muted">Estación</dt>
          <dd className="font-semibold">{stationName ?? item.station_id ?? "Sin estación"}</dd>
          <dt className="text-ink-muted">Matrícula</dt>
          <dd className="font-semibold">{item.bike_id ?? "—"}</dd>
          <dt className="text-ink-muted">Abierto</dt>
          <dd>
            {formatCdmx(new Date(item.created_at))} · por {ACTOR_LABEL[item.source]}
          </dd>
          <dt className="text-ink-muted">Asignado a</dt>
          <dd className="font-semibold">{item.assigned_to ?? "Nadie todavía"}</dd>
          {item.return_id ? (
            <>
              <dt className="text-ink-muted">Evidencia</dt>
              <dd>Verificación de anclaje {item.return_id}</dd>
            </>
          ) : null}
        </dl>
      </header>

      {item.is_open ? (
        <section aria-label="Acciones" className="space-y-3 border-t border-line pt-4">
          <div>
            <label htmlFor={ids.guardian} className="text-sm font-semibold">
              Asignar a un Guardián
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id={ids.guardian}
                value={guardian}
                onChange={(e) => setGuardian(e.target.value)}
                placeholder="Nombre o ID"
                className={INPUT}
              />
              <Button variant="soft" onClick={assign} disabled={busy || !guardian.trim()}>
                Asignar
              </Button>
            </div>
          </div>

          <div>
            <label htmlFor={ids.note} className="text-sm font-semibold">
              Nota (opcional)
            </label>
            <input
              id={ids.note}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={280}
              placeholder="Qué se revisó o encontró"
              className={`${INPUT} mt-1`}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {item.next_states.map((to, i) => (
              <Button key={to} variant={i === 0 ? "dark" : "soft"} size="sm" onClick={() => move(to)} disabled={busy}>
                {MOVE_LABEL[to]}
              </Button>
            ))}
          </div>
          {error ? (
            <p role="alert" className="text-sm font-semibold text-danger-700">
              {error}
            </p>
          ) : null}
        </section>
      ) : null}

      <section aria-label="Historial" className="border-t border-line pt-4">
        <h3 className="text-sm font-semibold">Historial</h3>
        <ol className="mt-2 space-y-3">
          {[...item.history].reverse().map((e, i) => (
            <li key={`${e.ts}-${i}`} className="border-l-2 border-brand-200 pl-3 text-sm">
              <p className="font-semibold">
                {e.from_state === null
                  ? `Abierto en «${STATE_LABEL[e.to_state]}»`
                  : e.from_state === e.to_state
                    ? "Nota"
                    : `${STATE_LABEL[e.from_state]} → ${STATE_LABEL[e.to_state]}`}
              </p>
              <p className="text-ink-muted">
                {formatCdmx(new Date(e.ts))} · {ACTOR_LABEL[e.actor]}
              </p>
              {e.note ? <p className="mt-0.5">{e.note}</p> : null}
            </li>
          ))}
        </ol>
      </section>
    </Card>
  );
}
