"use client";

import { BottomNav } from "@/features/app/bottom-nav";
import { useRouter } from "next/navigation";

/** Navegación inferior para las pantallas de misiones: Mapa y Lista regresan a /app. */
export function MissionNav() {
  const router = useRouter();
  return <BottomNav fixed activeKey="missions" onView={() => router.push("/app")} />;
}
