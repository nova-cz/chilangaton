export type MissionState = "completed" | "available" | "locked";

/** Misión DEMO del camino, con los nombres de estación ya resueltos. */
export interface MissionView {
  id: string;
  title: string;
  window_label: string;
  points: number;
  state: MissionState;
  from: { id: string; name: string; zone: string };
  to: { id: string; name: string; zone: string };
}

export interface PlayerStats {
  level: number;
  points: number;
  streak_days: number;
}

export type PathNode =
  | { kind: "mission"; mission: MissionView; index: number; current: boolean }
  | { kind: "chest"; id: string; unlocked: boolean };
