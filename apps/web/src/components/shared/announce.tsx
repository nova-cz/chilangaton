"use client";

/**
 * Avisos que no dependen de ver la pantalla: región viva para lector de pantalla,
 * voz (speechSynthesis) y vibración. Todo es opcional: si el navegador no lo soporta, no pasa nada.
 */

/** Región que el lector de pantalla anuncia cada vez que cambia `message`. */
export function Announce({ message, urgent = false }: { message: string; urgent?: boolean }) {
  return (
    <div role={urgent ? "alert" : "status"} aria-live={urgent ? "assertive" : "polite"} aria-atomic className="sr-only">
      {message}
    </div>
  );
}

export function speak(text: string): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "es-MX";
  window.speechSynthesis.speak(utterance);
}

/** Solo Android y algunos navegadores de escritorio; iOS lo ignora. */
export function vibrate(pattern: number | number[] = [200, 100, 200]): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
}
