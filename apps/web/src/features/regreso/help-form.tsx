"use client";

import { Announce } from "@/components/shared/announce";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/cn";
import { MessageCircle, Share2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useId, useState, type ReactNode } from "react";
import { ECOBICI_WHATSAPP, HELP_KINDS, helpMessage, isHelpKind, whatsappUrl, type HelpKind } from "./channels";

const TIPS: Record<HelpKind, string> = {
  robo: "Avisa a ECOBICI lo antes posible y, si puedes, haz la denuncia (abajo).",
  perdida: "Si no recuerdas dónde quedó, pon la última estación que usaste.",
  anclaje: "Antes de escribir, revisa que la luz del anclaje esté en verde y vuelve a empujar la bici.",
};

/** Arma el mensaje con estación, hora y matrícula; acepta ?tipo=&estacion=&matricula= para llegar prellenado. */
export function HelpForm() {
  const params = useSearchParams();
  const initialKind = params.get("tipo");
  const [kind, setKind] = useState<HelpKind>(isHelpKind(initialKind) ? initialKind : "robo");
  const [station, setStation] = useState(params.get("estacion") ?? "");
  const [bikeId, setBikeId] = useState(params.get("matricula") ?? "");
  const [notice, setNotice] = useState("");
  const [at] = useState(() => new Date());
  const ids = { station: useId(), bike: useId(), preview: useId() };

  const message = helpMessage({ kind, station, bikeId, at });

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ text: message });
        return;
      }
      await navigator.clipboard.writeText(message);
      setNotice("Mensaje copiado. Pégalo donde quieras enviarlo.");
    } catch (error) {
      // AbortError = la persona cerró el menú de compartir; no es un error.
      if (error instanceof DOMException && error.name === "AbortError") return;
      setNotice("No se pudo compartir. Copia el mensaje a mano desde el recuadro.");
    }
  };

  return (
    <Card className="space-y-4 p-5">
      <div>
        <h2 className="font-semibold">Escribe a ECOBICI</h2>
        <p className="mt-0.5 text-sm text-ink-muted">Te dejamos el mensaje listo para su WhatsApp oficial.</p>
      </div>

      <Segmented label="Qué pasó" options={HELP_KINDS} value={kind} onChange={setKind} className="w-full" />
      <p className="text-sm text-ink">{TIPS[kind]}</p>

      <div className="space-y-3">
        <Field id={ids.station} label="Estación" hint="Nombre o número, como CE-014">
          <input
            id={ids.station}
            value={station}
            onChange={(e) => setStation(e.target.value)}
            autoComplete="off"
            aria-describedby={`${ids.station}-hint`}
            className={INPUT}
          />
        </Field>
        <Field id={ids.bike} label="Matrícula de la bici (opcional)" hint="El número de la bici, si lo tienes">
          <input
            id={ids.bike}
            value={bikeId}
            onChange={(e) => setBikeId(e.target.value)}
            autoComplete="off"
            inputMode="numeric"
            aria-describedby={`${ids.bike}-hint`}
            className={INPUT}
          />
        </Field>
      </div>

      <div>
        <p id={ids.preview} className="text-sm font-semibold">
          Mensaje
        </p>
        <pre
          aria-labelledby={ids.preview}
          className="mt-1 rounded-2xl bg-surface p-3 font-sans text-sm whitespace-pre-wrap text-ink"
        >
          {message}
        </pre>
      </div>

      <div className="grid gap-2">
        <a
          href={whatsappUrl(message)}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonClasses("lime"), "w-full justify-center")}
        >
          <MessageCircle aria-hidden className="size-4" />
          Enviar por WhatsApp a ECOBICI
          <span className="sr-only">({ECOBICI_WHATSAPP.label}, abre WhatsApp)</span>
        </a>
        <Button variant="soft" className="w-full justify-center" onClick={share}>
          <Share2 aria-hidden className="size-4" />
          Compartir o copiar el mensaje
        </Button>
      </div>
      <Announce message={notice} />
      {notice ? <p className="text-sm text-ink-muted">{notice}</p> : null}
    </Card>
  );
}

const INPUT =
  "h-11 w-full rounded-2xl border border-line bg-white px-4 text-[15px] text-ink placeholder:text-ink-soft focus-visible:border-brand-500";

function Field({ id, label, hint, children }: { id: string; label: string; hint: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <p id={`${id}-hint`} className="text-xs text-ink-muted">
        {hint}
      </p>
      <div className="mt-1">{children}</div>
    </div>
  );
}
