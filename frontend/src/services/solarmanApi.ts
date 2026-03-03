import { API_BASE_URL, DEFAULT_PAGE_SIZE } from "../constants/app";
import type { StationApi } from "../types/station";
import { getErrorMessage } from "../utils/stationFormatters";

interface StationListResponse {
  stationList?: StationApi[];
  total?: number;
  message?: string;
}

interface AuthResponse {
  accessToken?: string;
  message?: string;
}

async function parseResponsePayload<T>(response: Response): Promise<T> {
  return (await response.json().catch(() => ({}))) as T;
}

export async function authenticateAccount(): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/auth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  const payload = await parseResponsePayload<AuthResponse>(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, "Falha na autenticacao."));
  }

  const token = typeof payload.accessToken === "string" ? payload.accessToken : "";
  if (!token.trim()) {
    throw new Error("A resposta de autenticacao nao incluiu accessToken.");
  }

  return token;
}

export async function requestStationsPage(params: {
  accessToken: string;
  page: number;
  size?: number;
}): Promise<{ stationList: StationApi[]; total: number | null }> {
  const { accessToken, page, size = DEFAULT_PAGE_SIZE } = params;
  const response = await fetch(`${API_BASE_URL}/api/stations/list`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      accessToken,
      page,
      size,
    }),
  });

  const payload = await parseResponsePayload<StationListResponse>(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(payload, "Falha ao carregar a lista de plantas.")
    );
  }

  if (!Array.isArray(payload.stationList)) {
    throw new Error("A resposta da lista de plantas e invalida.");
  }

  const totalValue = Number(payload.total);
  return {
    stationList: payload.stationList,
    total: Number.isFinite(totalValue) ? totalValue : null,
  };
}
