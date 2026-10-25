/** Escenarios de adopción del simulador (S3/S4). */
export const SCENARIOS = [0, 5, 10, 20] as const;
export type Scenario = (typeof SCENARIOS)[number];
