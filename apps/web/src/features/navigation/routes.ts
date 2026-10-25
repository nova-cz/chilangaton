import {
  Bike,
  ClipboardCheck,
  FlaskConical,
  Gauge,
  LayoutDashboard,
  LifeBuoy,
  List,
  Map,
  ShieldAlert,
  Target,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/**
 * Navegación central. Cada línea pone `ready: true` cuando su ruta exista.
 * Las rutas no listas se muestran deshabilitadas ("Próximamente"), nunca como 404.
 */
export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  owner: string;
  ready: boolean;
}

export const PANEL_NAV: NavItem[] = [
  { href: "/panel", label: "Resumen", icon: LayoutDashboard, owner: "Línea 4", ready: true },
  { href: "/panel/bici-util", label: "Bici útil", icon: Gauge, owner: "Línea 1", ready: true },
  { href: "/panel/taller", label: "Taller", icon: Wrench, owner: "Línea 2", ready: false },
  { href: "/panel/casos", label: "Incidentes y casos", icon: ShieldAlert, owner: "Línea 5", ready: false },
  { href: "/panel/simulador", label: "Simulador", icon: FlaskConical, owner: "Línea 4", ready: true },
  { href: "/panel/supervision", label: "Supervisión", icon: ClipboardCheck, owner: "Línea 1", ready: true },
];

/** Pestañas de la app móvil. `view` cambia la vista dentro de /app; `href` navega a otra ruta. */
export type AppTab =
  | { key: "map"; label: string; icon: LucideIcon; view: "map" }
  | { key: "list"; label: string; icon: LucideIcon; view: "list" }
  | { key: "missions"; label: string; icon: LucideIcon; view: "missions" }
  | { key: "trip"; label: string; icon: LucideIcon; href: string; owner: string; ready: boolean }
  | { key: "help"; label: string; icon: LucideIcon; href: string; owner: string; ready: boolean };

export const APP_TABS: AppTab[] = [
  { key: "map", label: "Mapa", icon: Map, view: "map" },
  { key: "list", label: "Lista", icon: List, view: "list" },
  { key: "trip", label: "Viaje", icon: Bike, href: "/app/viaje", owner: "Línea 3", ready: false },
  { key: "missions", label: "Misiones", icon: Target, view: "missions" },
  { key: "help", label: "Ayuda", icon: LifeBuoy, href: "/app/ayuda", owner: "Línea 5", ready: true },
];
