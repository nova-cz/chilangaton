import { AppExperience } from "@/features/app/app-experience";
import { getDemoDataset } from "@/features/demo/demo-data";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Estaciones" };

export default function AppPage() {
  // Modo DEMO: fixtures locales. Al corte A, cada línea conecta su contrato vía lib/api.ts.
  return <AppExperience data={getDemoDataset()} />;
}
