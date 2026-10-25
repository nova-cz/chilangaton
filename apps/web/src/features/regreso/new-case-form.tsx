"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ApiError } from "@/lib/api";
import { useId, useState, type FormEvent } from "react";
import { regresoApi, type Actor, type Case, type IncidentType, type StationOption } from "./api";
import { TYPE_LABEL } from "./case-labels";
import { findByCode } from "./stations";

const TYPES: IncidentType[] = ["robo", "perdida", "anclaje", "discrepancia"];
const INPUT =
  "h-11 w-full rounded-2xl border border-line bg-white px-4 text-[15px] text-ink placeholder:text-ink-soft focus-visible:border-brand-500";

/** Registrar un caso desde el panel, p. ej. cuando una persona llama o escribe a un Guardián. */
export function NewCaseForm({
  stations,
  actor,
  onCreated,
  onCancel,
}: {
  stations: StationOption[];
  actor: Actor;
  onCreated: (item: Case) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<IncidentType>("robo");
  const [code, setCode] = useState("");
  const [bikeId, setBikeId] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ids = { type: useId(), code: useId(), codeHint: useId(), bike: useId(), note: useId() };

  const station = findByCode(stations, code);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (code.trim() && !station) {
      setError("No encontramos esa estación. Escribe su número, como 14 o CE-014, o déjalo vacío.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { case: created } = await regresoApi.openIncident({
        type,
        source: actor,
        station_id: station?.station_id,
        bike_id: bikeId.trim() || undefined,
        note: note.trim() || undefined,
      });
      onCreated(created);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo registrar. Revisa la conexión.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="animate-rise p-5">
      <form onSubmit={submit} className="space-y-3">
        <h2 className="font-semibold">Registrar caso</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={ids.type} className="text-sm font-semibold">
              Qué pasó
            </label>
            <select id={ids.type} value={type} onChange={(e) => setType(e.target.value as IncidentType)} className={`${INPUT} mt-1`}>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={ids.code} className="text-sm font-semibold">
              Número de estación (opcional)
            </label>
            <input
              id={ids.code}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ej. 14"
              aria-describedby={ids.codeHint}
              className={`${INPUT} mt-1`}
            />
            <p id={ids.codeHint} className="mt-1 text-xs text-ink-muted" aria-live="polite">
              {station ? station.name : code.trim() ? "Sin coincidencia" : "Última estación conocida"}
            </p>
          </div>
          <div>
            <label htmlFor={ids.bike} className="text-sm font-semibold">
              Matrícula (opcional)
            </label>
            <input id={ids.bike} value={bikeId} onChange={(e) => setBikeId(e.target.value)} className={`${INPUT} mt-1`} />
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
              className={`${INPUT} mt-1`}
            />
          </div>
        </div>
        {error ? (
          <p role="alert" className="text-sm font-semibold text-danger-700">
            {error}
          </p>
        ) : null}
        <div className="flex gap-2">
          <Button type="submit" variant="dark" disabled={busy}>
            {busy ? "Registrando…" : "Registrar"}
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
