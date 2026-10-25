import { SupervisionView } from "@/features/bici-util/supervision-view";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Supervisión" };

/** /panel/supervision (Línea 1 · U4–U5). Los tres indicadores del contrato. */
export default function SupervisionPage() {
  return <SupervisionView />;
}
