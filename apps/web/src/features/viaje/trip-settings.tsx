"use client";

import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Accessibility, Footprints, Lock, Shuffle, Vibrate, Volume2 } from "lucide-react";
import { useState } from "react";
import { usePrefs } from "./prefs";
import { Switch } from "./switch";
import { DEFAULT_PREFS, type TripPrefs } from "./types";

const WALKS: TripPrefs["maxWalk"][] = [2, 3, 5, 10];

/** /app/ajustes · preferencias del viaje (V3) y de los avisos (V5). */
export function TripSettings() {
  const [prefs, update] = usePrefs();
  const [tested, setTested] = useState(false);

  const test = () => {
    const text = "Así suena un aviso: te quedan 5 minutos para anclar.";
    if (prefs.voice && "speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "es-MX";
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    }
    if (prefs.vibration && "vibrate" in navigator) navigator.vibrate([200, 100, 200]);
    setTested(true);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-[28px] leading-tight font-bold tracking-tight lg:text-4xl">Ajustes del viaje</h1>
      <p className="mt-1 text-ink-muted">Así decidimos qué estación sugerirte y cómo avisarte. Se guarda al momento.</p>

      <section aria-labelledby="caminar" className="mt-6 rounded-[var(--radius-card)] bg-card p-4 shadow-soft lg:p-5">
        <h2 id="caminar" className="text-lg font-bold tracking-tight">
          Si tu destino se llena
        </h2>
        <div className="mt-3 rounded-3xl bg-brand-100/70 p-4">
          <p className="flex items-center gap-2 font-semibold">
            <Footprints aria-hidden className="size-4 text-brand-700" />
            Camino como máximo
          </p>
          <p className="mt-0.5 text-sm text-ink-muted">Desde la otra estación hasta donde vas.</p>
          <Segmented
            className="mt-3 w-full"
            label="Caminata máxima"
            value={prefs.avoidEffort ? 2 : prefs.maxWalk}
            onChange={(v) => update({ maxWalk: v })}
            options={WALKS.map((w) => ({ value: w, label: `${w} min`, disabled: prefs.avoidEffort && w !== 2 }))}
          />
        </div>
        <div className="divide-y divide-line">
          <Switch
            icon={<Shuffle aria-hidden className="size-5" />}
            label="Sugerirme otra estación"
            description="Si es probable que no haya lugar, te proponemos dónde anclar y cuánto caminarías."
            checked={prefs.acceptAlternative}
            onChange={(v) => update({ acceptAlternative: v })}
          />
          <Switch
            icon={<Accessibility aria-hidden className="size-5" />}
            label="Evitar esfuerzo"
            description="Para movilidad reducida, carga o cansancio: solo estaciones a 2 min o menos de tu destino."
            checked={prefs.avoidEffort}
            onChange={(v) => update({ avoidEffort: v })}
          />
        </div>
      </section>

      <section aria-labelledby="avisos" className="mt-4 rounded-[var(--radius-card)] bg-card p-4 shadow-soft lg:p-5">
        <h2 id="avisos" className="text-lg font-bold tracking-tight">
          Avisos de los 45 minutos
        </h2>
        <p className="mt-0.5 text-sm text-ink-muted">Siempre verás el aviso en texto. A los 35, 40 y 42 min, y “¿Todo bien?” a los 45 y 90.</p>
        <div className="divide-y divide-line">
          <Switch icon={<Volume2 aria-hidden className="size-5" />} label="Voz" description="Lee el aviso en voz alta, útil si vas pedaleando." checked={prefs.voice} onChange={(v) => update({ voice: v })} />
          <Switch icon={<Vibrate aria-hidden className="size-5" />} label="Vibración" description="En teléfonos que lo permiten (Android)." checked={prefs.vibration} onChange={(v) => update({ vibration: v })} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Button variant="soft" size="sm" onClick={test}>
            Probar aviso
          </Button>
          <p role="status" className="text-sm text-ink-muted">
            {tested ? (prefs.voice || prefs.vibration ? "Si no escuchaste nada, sube el volumen o revisa el modo silencio." : "Voz y vibración están apagadas: solo verás el texto.") : null}
          </p>
        </div>
      </section>

      <section className="mt-4 flex gap-3 rounded-[var(--radius-card)] bg-mist-100 p-4">
        <Lock aria-hidden className="mt-0.5 size-5 shrink-0 text-brand-700" />
        <div className="text-sm">
          <p className="font-semibold">Se queda en este teléfono</p>
          <p className="mt-0.5 text-ink-muted">No pedimos edad, género ni cuenta. Estas preferencias no se envían a nadie más que al cálculo de tu viaje.</p>
          <button type="button" onClick={() => update(DEFAULT_PREFS)} className="mt-2 font-semibold text-brand-700 hover:underline">
            Restablecer
          </button>
        </div>
      </section>
    </div>
  );
}
