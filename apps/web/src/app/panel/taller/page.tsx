import { TallerView } from "@/features/taller/taller-view";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Taller" };

/** /panel/taller (Línea 2 · D6). Datos: GET /api/v1/taller/* o la foto grabada del historial. */
export default function TallerPage() {
  return <TallerView />;
}
