import { CasesView } from "@/features/regreso/cases-view";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Incidentes y casos" };

/** /panel/casos (Línea 5 · R5). Datos: GET /api/v1/cases y /api/v1/returns/stations. */
export default function CasosPage() {
  return <CasesView />;
}
