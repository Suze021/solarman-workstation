export function toNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeEpochMilliseconds(value: unknown): number | null {
  const numericValue = toNumber(value);
  if (numericValue === null || numericValue <= 0) {
    return null;
  }
  // A API pode enviar epoch em segundos; normalizamos para milissegundos.
  return numericValue < 1_000_000_000_000 ? numericValue * 1000 : numericValue;
}

export function formatDateTime(value: unknown): string {
  const epochMs = normalizeEpochMilliseconds(value);
  if (epochMs === null) {
    return "Nao informado";
  }
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(epochMs));
}

export function toGenerationPowerKw(value: unknown): number | null {
  const numericValue = toNumber(value);
  if (numericValue === null) {
    return null;
  }
  // Mantem compatibilidade com payloads em W sem quebrar os casos ja em kW.
  if (numericValue >= 1000) {
    return numericValue / 1000;
  }
  return numericValue;
}

export function formatValue(value: string | null | undefined): string {
  const safeValue = typeof value === "string" ? value.trim() : "";
  return safeValue ? safeValue : "Nao informado";
}

export function formatNumber(value: number | null, fractionDigits = 2): string {
  if (value === null) {
    return "Nao informado";
  }
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function getErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  return fallback;
}
