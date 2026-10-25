import { AppLoader } from "@/features/app/app-loader";
import { getDemoDataset } from "@/features/demo/demo-data";
import { config } from "@/lib/config";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Estaciones" };

export default function AppPage() {
  return <AppLoader demo={config.dataMode === "demo" ? getDemoDataset() : undefined} />;
}
