import { ReportView } from "@/features/bici-util/report-view";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Reporte para Semovi" };

/** /panel/supervision/reporte (Línea 1 · U7). Imprimible; incluye los casos de la Línea 5 (C5). */
export default function ReportePage() {
  return <ReportView />;
}
