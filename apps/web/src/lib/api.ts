import { config } from "./config";

/** Error con el formato de la API: {"error": {"code", "message"}}. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

/** GET tipado contra FastAPI. `path` va sin prefijo: apiGet("/viaje/stations/1/forecast"). */
export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${config.apiUrl}${config.apiPrefix}${path}`, {
    ...init,
    headers: { Accept: "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
    throw new ApiError(res.status, body?.error?.code ?? `http_${res.status}`, body?.error?.message ?? res.statusText);
  }
  return (await res.json()) as T;
}
