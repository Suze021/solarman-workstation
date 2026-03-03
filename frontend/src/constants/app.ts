export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  "http://localhost:3001";

export const TOKEN_STORAGE_KEY = "solarman_workstation_access_token";
export const DEFAULT_PAGE_SIZE = 20;
