import { PanelShell } from "@/features/panel/panel-shell";
import type { Metadata } from "next";

export const metadata: Metadata = { title: { default: "Panel", template: "%s · Panel · Equilibici" } };

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return <PanelShell>{children}</PanelShell>;
}
