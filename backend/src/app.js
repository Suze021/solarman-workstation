const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { requestAccessToken, requestStationList } = require("./solarmanClient");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "solarman-workstation-backend" });
});

app.post("/api/auth/token", async (_req, res) => {
  try {
    const { accessToken, tokenType, expiresInSeconds } =
      await requestAccessToken();

    return res.json({
      accessToken,
      tokenType,
      expiresInSeconds,
      expiresInDays: 60,
    });
  } catch (error) {
    if (error && error.code === "SOLARMAN_BUSINESS_ERROR") {
      return res.status(502).json({
        message: error.message,
        solarmanCode: error.solarmanCode || "UNKNOWN_SOLARMAN_CODE",
        upstreamData: error.upstream || null,
      });
    }

    if (axios.isAxiosError(error) && error.response) {
      return res.status(error.response.status).json({
        message: "Authentication with Solarman API failed.",
        upstreamStatus: error.response.status,
        upstreamData: error.response.data,
      });
    }

    if (axios.isAxiosError(error) && error.request) {
      const status = error.code === "ECONNABORTED" ? 504 : 503;
      const message =
        error.code === "ECONNABORTED"
          ? "Request to Solarman API timed out."
          : "Network error while reaching Solarman API.";

      return res
        .status(status)
        .json({ message, code: error.code || "NETWORK_ERROR" });
    }

    if (error && error.code === "SOLARMAN_INVALID_TOKEN_RESPONSE") {
      return res.status(502).json({
        message: "Invalid response from Solarman API during authentication.",
      });
    }

    return res.status(500).json({
      message: "Unexpected error during authentication.",
    });
  }
});

app.post("/api/stations/list", async (req, res) => {
  const { accessToken, page, size, language } = req.body || {};
  const parsedPage = Number(page);
  const parsedSize = size === undefined ? 20 : Number(size);

  if (typeof accessToken !== "string" || !accessToken.trim()) {
    return res.status(400).json({
      message: "accessToken is required.",
    });
  }

  if (!Number.isInteger(parsedPage) || parsedPage < 1) {
    return res.status(400).json({
      message: "page must be an integer greater than or equal to 1.",
    });
  }

  if (!Number.isInteger(parsedSize) || parsedSize < 1) {
    return res.status(400).json({
      message: "size must be an integer greater than or equal to 1.",
    });
  }

  try {
    const { stationList, total } = await requestStationList({
      accessToken: accessToken.trim(),
      page: parsedPage,
      size: parsedSize,
      language,
    });

    return res.json({
      page: parsedPage,
      size: parsedSize,
      total,
      stationList,
    });
  } catch (error) {
    if (error && error.code === "SOLARMAN_BUSINESS_ERROR") {
      return res.status(502).json({
        message: error.message,
        solarmanCode: error.solarmanCode || "UNKNOWN_SOLARMAN_CODE",
        upstreamData: error.upstream || null,
      });
    }

    if (axios.isAxiosError(error) && error.response) {
      return res.status(error.response.status).json({
        message: "Failed to fetch stations from Solarman API.",
        upstreamStatus: error.response.status,
        upstreamData: error.response.data,
      });
    }

    if (axios.isAxiosError(error) && error.request) {
      const status = error.code === "ECONNABORTED" ? 504 : 503;
      const message =
        error.code === "ECONNABORTED"
          ? "Request to Solarman API timed out."
          : "Network error while reaching Solarman API.";

      return res
        .status(status)
        .json({ message, code: error.code || "NETWORK_ERROR" });
    }

    if (error && error.code === "SOLARMAN_INVALID_STATION_RESPONSE") {
      return res.status(502).json({
        message: "Invalid response from Solarman API during station listing.",
      });
    }

    return res.status(500).json({
      message: "Unexpected error while listing stations.",
    });
  }
});

module.exports = { app };
