const axios = require("axios");
const crypto = require("crypto");
const { config } = require("./config");

const client = axios.create({
  baseURL: config.solarmanBaseUrl,
  timeout: config.requestTimeoutMs,
  headers: {
    "Content-Type": "application/json",
  },
});

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function isFailurePayload(payload) {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  if (payload.success === false) {
    return true;
  }

  if (typeof payload.code === "string" && payload.code.trim() && payload.code !== "0") {
    return true;
  }

  if (typeof payload.code === "number" && payload.code !== 0) {
    return true;
  }

  return false;
}

function buildBusinessError(payload, fallbackMessage) {
  const msg =
    typeof payload?.msg === "string" && payload.msg.trim()
      ? payload.msg.trim()
      : fallbackMessage;
  const code =
    payload && typeof payload === "object" && "code" in payload
      ? String(payload.code)
      : "UNKNOWN_SOLARMAN_CODE";
  const error = new Error(msg);
  error.code = "SOLARMAN_BUSINESS_ERROR";
  error.solarmanCode = code;
  error.upstream = payload;
  return error;
}

function extractToken(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  if (typeof payload.access_token === "string" && payload.access_token.trim()) {
    return payload.access_token;
  }

  if (typeof payload.accessToken === "string" && payload.accessToken.trim()) {
    return payload.accessToken;
  }

  if (
    payload.data &&
    typeof payload.data === "object" &&
    typeof payload.data.access_token === "string" &&
    payload.data.access_token.trim()
  ) {
    return payload.data.access_token;
  }

  if (
    payload.data &&
    typeof payload.data === "object" &&
    typeof payload.data.accessToken === "string" &&
    payload.data.accessToken.trim()
  ) {
    return payload.data.accessToken;
  }

  return null;
}

function extractStationList(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  if (Array.isArray(payload.stationList)) {
    return payload.stationList;
  }

  if (payload.data && typeof payload.data === "object" && Array.isArray(payload.data.stationList)) {
    return payload.data.stationList;
  }

  return null;
}

function extractTotal(payload, stationListLength) {
  const first = Number(payload?.total);
  if (Number.isFinite(first)) {
    return first;
  }

  const second = Number(payload?.data?.total);
  if (Number.isFinite(second)) {
    return second;
  }

  return stationListLength;
}

async function requestAccessToken() {
  const response = await client.post(
    "/account/v1.0/token",
    {
      appSecret: config.appSecret,
      email: config.email,
      password: sha256(config.password),
      orgId: config.orgId,
    },
    {
      params: { appId: config.appId },
    }
  );

  const accessToken = extractToken(response.data);
  const tokenType =
    response.data?.token_type || response.data?.tokenType || "bearer";
  const expiresInRaw = response.data?.expires_in || response.data?.expiresIn;
  const expiresInSeconds = Number(expiresInRaw);

  if (isFailurePayload(response.data)) {
    throw buildBusinessError(
      response.data,
      "Solarman returned an authentication business error."
    );
  }

  if (!accessToken) {
    const error = new Error("Solarman response does not contain accessToken.");
    error.code = "SOLARMAN_INVALID_TOKEN_RESPONSE";
    throw error;
  }

  return {
    accessToken,
    tokenType,
    expiresInSeconds: Number.isFinite(expiresInSeconds)
      ? expiresInSeconds
      : null,
    upstream: response.data,
  };
}

async function requestStationList({
  accessToken,
  page,
  size = 20,
  language,
}) {
  const payload = {
    page,
    size,
  };

  if (typeof language === "string" && language.trim()) {
    payload.language = language.trim();
  }

  const response = await client.post("/station/v1.0/list", payload, {
    headers: {
      Authorization: `bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (isFailurePayload(response.data)) {
    throw buildBusinessError(
      response.data,
      "Solarman returned a station list business error."
    );
  }

  const stationList = extractStationList(response.data);

  if (!Array.isArray(stationList)) {
    const error = new Error("Solarman response does not contain stationList.");
    error.code = "SOLARMAN_INVALID_STATION_RESPONSE";
    throw error;
  }

  const total = extractTotal(response.data, stationList.length);

  return {
    stationList,
    total,
    upstream: response.data,
  };
}

module.exports = { requestAccessToken, requestStationList };
