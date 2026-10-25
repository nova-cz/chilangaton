/**
 * Canales oficiales, verificados el 25 oct 2026:
 * - WhatsApp y teléfono de ECOBICI: ecobici.cdmx.gob.mx (inicio, contacto y preguntas frecuentes).
 * - Denuncia digital: enlazada desde fgjcdmx.gob.mx (Fiscalía General de Justicia de la CDMX).
 * Equilibici no tiene integración oficial: solo deja el mensaje listo para que la persona lo envíe.
 */
export const ECOBICI_WHATSAPP = { number: "528003262421", label: "800 326 2421" };
export const ECOBICI_PHONE = { tel: "5550052424", label: "55 5005 2424" };
export const EMERGENCIAS = { tel: "911", label: "911" };
export const DENUNCIA_DIGITAL_URL = "https://denunciadigital.cdmx.gob.mx/";

export type HelpKind = "robo" | "perdida" | "anclaje";

export const HELP_KINDS: { value: HelpKind; label: string }[] = [
  { value: "robo", label: "Robo" },
  { value: "perdida", label: "Pérdida" },
  { value: "anclaje", label: "Anclaje" },
];

export function isHelpKind(value: string | null): value is HelpKind {
  return value === "robo" || value === "perdida" || value === "anclaje";
}

const SUBJECT: Record<HelpKind, string> = {
  robo: "el robo de una bici",
  perdida: "una bici que perdí o no sé dónde quedó",
  anclaje: "un anclaje que no se registró",
};

/** Hora CDMX legible; se guarda en UTC y se muestra en hora local. */
export function formatCdmx(date: Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: "America/Mexico_City",
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function helpMessage({
  kind,
  station,
  bikeId,
  at,
}: {
  kind: HelpKind;
  station: string;
  bikeId: string;
  at: Date;
}): string {
  return [
    `Hola, ECOBICI. Quiero reportar ${SUBJECT[kind]}.`,
    `Estación: ${station.trim() || "no la sé"}`,
    `Matrícula de la bici: ${bikeId.trim() || "no la tengo"}`,
    `Hora: ${formatCdmx(at)} (hora CDMX)`,
  ].join("\n");
}

export function whatsappUrl(text: string): string {
  return `https://wa.me/${ECOBICI_WHATSAPP.number}?text=${encodeURIComponent(text)}`;
}

/** Enlace a /app/ayuda con los datos ya puestos (lo usan "¿Todo bien?" y "Anclé aquí"). */
export function helpHref({ kind, station, bikeId }: { kind: HelpKind; station?: string; bikeId?: string }): string {
  const params = new URLSearchParams({ tipo: kind });
  if (station) params.set("estacion", station);
  if (bikeId) params.set("matricula", bikeId);
  return `/app/ayuda?${params.toString()}`;
}
