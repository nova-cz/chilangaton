import { TallerView } from "@/features/taller/taller-view";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Taller" };

/** /panel/taller · prioridad de taller y riesgo de pérdida. Datos: GET /api/v1/taller/* o la foto grabada. */
export default function TallerPage() {
  return <TallerView />;
}
