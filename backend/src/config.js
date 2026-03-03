const dotenv = require("dotenv");

dotenv.config();

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number(value ?? fallback);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const config = {
  port: parsePositiveInteger(process.env.PORT, 3001),
  solarmanBaseUrl:
    process.env.SOLARMAN_BASE_URL?.trim() || "https://globalapi.solarmanpv.com",
  appId: getRequiredEnv("SOLARMAN_APP_ID"),
  appSecret: getRequiredEnv("SOLARMAN_APP_SECRET"),
  email: getRequiredEnv("SOLARMAN_EMAIL"),
  password: getRequiredEnv("SOLARMAN_PASSWORD"),
  orgId: parsePositiveInteger(getRequiredEnv("SOLARMAN_ORG_ID"), 3426),
  requestTimeoutMs: parsePositiveInteger(process.env.SOLARMAN_TIMEOUT_MS, 15000),
};

module.exports = { config };
