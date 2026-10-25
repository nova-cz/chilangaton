"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { Check, ThumbsUp, Wrench } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const ISSUES = ["Frenos", "Llanta", "Cadena", "Asiento", "Manubrio", "Luces", "Otra cosa"] as const;

type Verdict = "ok" | "issue" | null;

/** V7 · "¿Cómo estuvo tu bici?" al terminar el contador. Sin datos personales; en el demo no se envía a ningún lado. */
export function BikeFeedback({ stationName, onDone }: { stationName: string; onDone: () => void }) {
  const [verdict, setVerdict] = useState<Verdict>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [sent, setSent] = useState(false);
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    root.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const toggle = (name: string) => setPicked((p) => (p.includes(name) ? p.filter((x) => x !== name) : [...p, name]));

  if (sent) {
    return (
      <section ref={root} aria-label="Gracias" className="scroll-mt-24 animate-sheet-in rounded-[var(--radius-sheet)] bg-brand-900 p-5 text-white">
        <span className="grid size-12 place-items-center rounded-full bg-lime-300 text-brand-900">
          <Check aria-hidden className="size-6" />
        </span>
        <h2 className="mt-3 text-2xl font-bold tracking-tight">Gracias por contarnos</h2>
        <p className="mt-1 text-white/80">
          {verdict === "issue" && picked.length > 0
            ? "Así se podría avisar al taller qué bicis revisar primero."
            : "Que la bici esté bien también ayuda a saber cuáles estaciones sí funcionan."}
        </p>
        <p role="status" className="mt-3 rounded-2xl bg-white/10 px-3.5 py-3 text-sm text-white/80">
          En esta demo tu respuesta no se envía a ningún lado ni se liga a tu cuenta. No pedimos tu nombre, edad ni género.
        </p>
        <Button variant="lime" className="mt-4 w-full justify-center" onClick={onDone}>
          Planear otro viaje
        </Button>
      </section>
    );
  }

  return (
    <section ref={root} aria-labelledby="fb-title" className="scroll-mt-24 animate-sheet-in rounded-[var(--radius-sheet)] bg-brand-900 p-5 text-white">
      <p className="text-sm font-semibold text-lime-300">Terminaste en {stationName}</p>
      <h2 id="fb-title" className="mt-1 text-2xl font-bold tracking-tight">
        ¿Cómo estuvo tu bici?
      </h2>

      <div role="group" aria-label="Estado de la bici" className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-pressed={verdict === "ok"}
          onClick={() => setVerdict("ok")}
          className={cn(
            "flex flex-col items-center gap-1.5 rounded-3xl px-3 py-4 font-semibold transition-colors",
            verdict === "ok" ? "bg-lime-300 text-brand-900" : "bg-white/10 hover:bg-white/15",
          )}
        >
          <ThumbsUp aria-hidden className="size-6" /> Estaba bien
        </button>
        <button
          type="button"
          aria-pressed={verdict === "issue"}
          onClick={() => setVerdict("issue")}
          className={cn(
            "flex flex-col items-center gap-1.5 rounded-3xl px-3 py-4 font-semibold transition-colors",
            verdict === "issue" ? "bg-lime-300 text-brand-900" : "bg-white/10 hover:bg-white/15",
          )}
        >
          <Wrench aria-hidden className="size-6" /> Tuvo un detalle
        </button>
      </div>

      {verdict === "issue" ? (
        <div className="mt-4">
          <p id="fb-issues" className="text-sm font-semibold text-white/80">
            ¿Qué notaste? Puedes elegir varias.
          </p>
          <div role="group" aria-labelledby="fb-issues" className="mt-2 flex flex-wrap gap-2">
            {ISSUES.map((i) => {
              const on = picked.includes(i);
              return (
                <button
                  key={i}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(i)}
                  className={cn(
                    "inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors",
                    on ? "bg-lime-300 text-brand-900" : "bg-white/10 hover:bg-white/15",
                  )}
                >
                  {on ? <Check aria-hidden className="size-4" /> : null}
                  {i}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-5 grid gap-2">
        <Button variant="lime" className="justify-center" disabled={verdict === null} onClick={() => setSent(true)}>
          Enviar
        </Button>
        <Button variant="glass" className="justify-center bg-white/10 text-white hover:bg-white/20" onClick={onDone}>
          Ahora no
        </Button>
      </div>
      {verdict === null ? <p className="mt-2 text-xs text-white/60">Elige una opción para enviar.</p> : null}
    </section>
  );
}
