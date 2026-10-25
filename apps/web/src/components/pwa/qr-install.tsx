"use client";

import { cn } from "@/lib/cn";
import { QRCodeSVG } from "qrcode.react";
import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** QR hacia la app para abrirla/instalarla en el celular durante la demo. */
export function QrInstall({ path = "/app", className, size = 132 }: { path?: string; className?: string; size?: number }) {
  const origin = useSyncExternalStore(
    noop,
    () => process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin,
    () => null,
  );
  const url = origin ? `${origin}${path}` : null;

  return (
    <figure className={cn("flex flex-col items-center gap-2", className)}>
      <div className="rounded-2xl bg-white p-3 shadow-soft ring-1 ring-line" style={{ width: size + 24, height: size + 24 }}>
        {url ? (
          <QRCodeSVG value={url} size={size} fgColor="#063F2E" bgColor="#FFFFFF" level="M" title={`Código QR para abrir ${url}`} />
        ) : null}
      </div>
      <figcaption className="max-w-[12rem] text-center text-xs break-all text-ink-muted">{url ?? "Generando QR…"}</figcaption>
    </figure>
  );
}
