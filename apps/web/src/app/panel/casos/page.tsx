import { CasosView } from "@/features/casos/casos-view";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Incidentes y casos" };

/** /panel/casos · seguimiento de casos. Datos: GET /api/v1/cases o casos de ejemplo con etiqueta DEMO. */
export default function CasosPage() {
  return <CasosView />;
}
