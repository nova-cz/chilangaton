import { BiciUtilView } from "@/features/bici-util/bici-util-view";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Bici útil" };

/** /panel/bici-util (Línea 1 · U5). Datos: GET /api/v1/bici-util/* o la foto grabada del feed. */
export default function BiciUtilPage() {
  return <BiciUtilView />;
}
