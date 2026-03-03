function normalizeBaseUrl(value: string | undefined): string {
  return (value || "").trim().replace(/\/+$/, "");
}

function shouldUseRelativeApiPath(configuredBaseUrl: string): boolean {
  if (!configuredBaseUrl) {
    return true;
  }

  const isLocalhostTarget = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(
    configuredBaseUrl
  );
  const isRemoteAccess =
    typeof window !== "undefined" &&
    !["localhost", "127.0.0.1"].includes(window.location.hostname);

  // Quando acessado por celular/tunnel, evita tentar localhost do proprio aparelho.
  return isLocalhostTarget && isRemoteAccess;
}

const configuredBaseUrl = normalizeBaseUrl(
  import.meta.env.VITE_API_BASE_URL as string | undefined
);

export const API_BASE_URL = shouldUseRelativeApiPath(configuredBaseUrl)
  ? ""
  : configuredBaseUrl;

export const TOKEN_STORAGE_KEY = "solarman_workstation_access_token";
export const DEFAULT_PAGE_SIZE = 20;
