<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

interface StationApi {
  id?: number;
  name?: string;
  locationAddress?: string;
  networkStatus?: string;
  generationPower?: number | string | null;
  installedCapacity?: number | string | null;
  type?: string;
  gridInterconnectionType?: string;
  startOperatingTime?: number | string | null;
  lastUpdateTime?: number | string | null;
  batterySoc?: number | string | null;
  ownerName?: string;
  contactPhone?: string;
}

interface StationViewModel {
  idKey: string;
  name: string;
  locationAddress: string;
  networkStatus: string;
  generationPowerKw: number | null;
  installedCapacityKw: number | null;
  utilizationPercent: number | null;
  type: string;
  gridInterconnectionType: string;
  startOperatingTime: string;
  lastUpdateTime: string;
  batterySoc: string;
  ownerName: string;
  contactPhone: string;
}

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  "http://localhost:3001";
const TOKEN_STORAGE_KEY = "solarman_workstation_access_token";
const PAGE_SIZE = 20;

const accessToken = ref("");
const isAuthenticating = ref(false);
const isLoadingStations = ref(false);
const authError = ref("");
const authSuccess = ref("");
const stationsError = ref("");
const stations = ref<StationViewModel[]>([]);
const currentPage = ref(1);
const totalStations = ref<number | null>(null);
const showComparisonTable = ref(false);

const maskedToken = computed(() => {
  if (!accessToken.value) {
    return "";
  }

  if (accessToken.value.length <= 14) {
    return accessToken.value;
  }

  const prefix = accessToken.value.slice(0, 8);
  const suffix = accessToken.value.slice(-6);
  return `${prefix}...${suffix}`;
});

const hasPreviousPage = computed(() => currentPage.value > 1);
const hasNextPage = computed(() => {
  if (typeof totalStations.value === "number") {
    return currentPage.value * PAGE_SIZE < totalStations.value;
  }

  return stations.value.length >= PAGE_SIZE;
});

const totalLabel = computed(() => {
  if (typeof totalStations.value !== "number") {
    return "";
  }

  return `${totalStations.value} plantas`;
});

function loadStoredToken() {
  const savedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);
  accessToken.value = savedToken || "";
}

function toNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeEpochMilliseconds(value: unknown): number | null {
  const numericValue = toNumber(value);
  if (numericValue === null || numericValue <= 0) {
    return null;
  }

  // Input expected as milliseconds, but fallback handles second-based payloads.
  return numericValue < 1_000_000_000_000 ? numericValue * 1000 : numericValue;
}

function formatDateTime(value: unknown): string {
  const epochMs = normalizeEpochMilliseconds(value);
  if (epochMs === null) {
    return "Nao informado";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(epochMs));
}

function toGenerationPowerKw(value: unknown): number | null {
  const numericValue = toNumber(value);
  if (numericValue === null) {
    return null;
  }

  if (numericValue >= 1000) {
    return numericValue / 1000;
  }

  return numericValue;
}

function formatValue(value: string | null | undefined): string {
  const safeValue = typeof value === "string" ? value.trim() : "";
  return safeValue ? safeValue : "Nao informado";
}

function formatNumber(value: number | null, fractionDigits = 2): string {
  if (value === null) {
    return "Nao informado";
  }

  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

function normalizeStation(station: StationApi, index: number): StationViewModel {
  const generationPowerKw = toGenerationPowerKw(station.generationPower);
  const installedCapacityKw = toNumber(station.installedCapacity);
  const utilizationPercent =
    generationPowerKw !== null &&
    installedCapacityKw !== null &&
    installedCapacityKw > 0
      ? (generationPowerKw / installedCapacityKw) * 100
      : null;
  const batterySoc = toNumber(station.batterySoc);

  const baseId =
    typeof station.id === "number" ? String(station.id) : String(index);

  return {
    idKey: baseId,
    name: formatValue(station.name),
    locationAddress: formatValue(station.locationAddress),
    networkStatus: formatValue(station.networkStatus),
    generationPowerKw,
    installedCapacityKw,
    utilizationPercent,
    type: formatValue(station.type),
    gridInterconnectionType: formatValue(station.gridInterconnectionType),
    startOperatingTime: formatDateTime(station.startOperatingTime),
    lastUpdateTime: formatDateTime(station.lastUpdateTime),
    batterySoc: batterySoc === null ? "Nao informado" : `${formatNumber(batterySoc)}%`,
    ownerName: formatValue(station.ownerName),
    contactPhone: formatValue(station.contactPhone),
  };
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}

async function fetchStations(page: number) {
  if (!accessToken.value) {
    stationsError.value = "Autentique antes de carregar a lista de plantas.";
    return;
  }

  stationsError.value = "";
  isLoadingStations.value = true;

  try {
    const response = await fetch(`${API_BASE_URL}/api/stations/list`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        accessToken: accessToken.value,
        page,
        size: PAGE_SIZE,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      stationList?: StationApi[];
      total?: number;
      message?: string;
    };

    if (!response.ok) {
      throw new Error(getErrorMessage(payload, "Failed to load station list."));
    }

    if (!Array.isArray(payload.stationList)) {
      throw new Error("Station list response is invalid.");
    }

    stations.value = payload.stationList.map((station, index) =>
      normalizeStation(station, index)
    );
    totalStations.value = Number.isFinite(Number(payload.total))
      ? Number(payload.total)
      : null;
    currentPage.value = page;
  } catch (error) {
    stations.value = [];
    totalStations.value = null;
    stationsError.value =
      error instanceof Error
        ? error.message
        : "Unexpected error while loading stations.";
  } finally {
    isLoadingStations.value = false;
  }
}

async function authenticate() {
  authError.value = "";
  authSuccess.value = "";
  isAuthenticating.value = true;

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(getErrorMessage(payload, "Authentication failed."));
    }

    const token =
      payload && typeof payload === "object" && "accessToken" in payload
        ? String((payload as { accessToken?: string }).accessToken || "")
        : "";

    if (!token) {
      throw new Error("Authentication response did not include accessToken.");
    }

    accessToken.value = token;
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    authSuccess.value = "Autenticacao concluida. Token armazenado localmente.";
    await fetchStations(1);
  } catch (error) {
    authError.value =
      error instanceof Error
        ? error.message
        : "Unexpected error during authentication.";
  } finally {
    isAuthenticating.value = false;
  }
}

function clearStoredToken() {
  accessToken.value = "";
  authError.value = "";
  authSuccess.value = "";
  stations.value = [];
  stationsError.value = "";
  totalStations.value = null;
  currentPage.value = 1;
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

async function goToPreviousPage() {
  if (!hasPreviousPage.value || isLoadingStations.value) {
    return;
  }

  await fetchStations(currentPage.value - 1);
}

async function goToNextPage() {
  if (!hasNextPage.value || isLoadingStations.value) {
    return;
  }

  await fetchStations(currentPage.value + 1);
}

onMounted(async () => {
  loadStoredToken();
  if (accessToken.value) {
    await fetchStations(1);
  }
});
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <h1>Solarman Workstation</h1>
      <p>Teste Tecnico: Integracao com API Solarman</p>
    </header>

    <main class="content" aria-live="polite">
      <section class="panel" aria-label="Painel de autenticacao">
        <h2>Autenticacao Solarman</h2>
        <p class="muted">
          Credenciais configuradas no backend. O token e reutilizado nas
          requisicoes seguintes.
        </p>

        <div class="actions">
          <button
            type="button"
            class="primary-button"
            :disabled="isAuthenticating"
            @click="authenticate"
          >
            {{ isAuthenticating ? "Autenticando..." : "Autenticar conta" }}
          </button>
          <button
            type="button"
            class="secondary-button"
            :disabled="isAuthenticating || !accessToken"
            @click="clearStoredToken"
          >
            Limpar token
          </button>
          <button
            type="button"
            class="secondary-button"
            :disabled="!accessToken || isLoadingStations"
            @click="fetchStations(1)"
          >
            {{ isLoadingStations ? "Carregando..." : "Atualizar lista" }}
          </button>
        </div>

        <p v-if="authSuccess" class="feedback success">{{ authSuccess }}</p>
        <p v-if="authError" class="feedback error">{{ authError }}</p>

        <div class="token-box" v-if="accessToken">
          <p class="token-title">Token atual (mascarado)</p>
          <code>{{ maskedToken }}</code>
        </div>
      </section>

      <section class="panel" aria-label="Lista de plantas solares">
        <div class="section-header">
          <h2>Plantas solares</h2>
          <p class="muted">
            Pagina {{ currentPage }} <span v-if="totalLabel">| {{ totalLabel }}</span>
          </p>
        </div>

        <label class="toggle-line">
          <input type="checkbox" v-model="showComparisonTable" />
          Mostrar tabela comparativa (campos complementares)
        </label>

        <p v-if="stationsError" class="feedback error">{{ stationsError }}</p>
        <p v-else-if="isLoadingStations" class="feedback neutral">
          Carregando lista de plantas...
        </p>
        <p
          v-else-if="accessToken && stations.length === 0"
          class="feedback neutral"
        >
          Nenhuma planta encontrada para a pagina atual.
        </p>
        <p v-else-if="!accessToken" class="feedback neutral">
          Autentique para visualizar as plantas.
        </p>

        <div v-if="stations.length > 0" class="cards-grid">
          <article
            v-for="station in stations"
            :key="station.idKey"
            class="station-card"
          >
            <header class="station-header">
              <h3>{{ station.name }}</h3>
              <span
                class="status-badge"
                :class="{
                  online: station.networkStatus.includes('ONLINE') && !station.networkStatus.includes('OFFLINE'),
                  offline: station.networkStatus.includes('OFFLINE')
                }"
              >
                {{ station.networkStatus }}
              </span>
            </header>

            <dl class="station-fields">
              <div>
                <dt>Endereco</dt>
                <dd>{{ station.locationAddress }}</dd>
              </div>
              <div>
                <dt>Geracao atual (kW)</dt>
                <dd>{{ formatNumber(station.generationPowerKw) }}</dd>
              </div>
              <div>
                <dt>Capacidade instalada (kW)</dt>
                <dd>{{ formatNumber(station.installedCapacityKw) }}</dd>
              </div>
              <div>
                <dt>Taxa de utilizacao</dt>
                <dd>
                  {{
                    station.utilizationPercent === null
                      ? "Nao informado"
                      : `${formatNumber(station.utilizationPercent)}%`
                  }}
                </dd>
              </div>
              <div>
                <dt>Tipo de planta</dt>
                <dd>{{ station.type }}</dd>
              </div>
              <div>
                <dt>Tipo de interconexao</dt>
                <dd>{{ station.gridInterconnectionType }}</dd>
              </div>
              <div>
                <dt>Inicio de operacao</dt>
                <dd>{{ station.startOperatingTime }}</dd>
              </div>
              <div>
                <dt>Ultima atualizacao</dt>
                <dd>{{ station.lastUpdateTime }}</dd>
              </div>
              <div>
                <dt>Nivel de bateria</dt>
                <dd>{{ station.batterySoc }}</dd>
              </div>
              <div>
                <dt>Proprietario</dt>
                <dd>{{ station.ownerName }}</dd>
              </div>
              <div>
                <dt>Telefone</dt>
                <dd>{{ station.contactPhone }}</dd>
              </div>
            </dl>
          </article>
        </div>

        <div
          v-if="showComparisonTable && stations.length > 0"
          class="comparison-table-wrapper"
        >
          <table class="comparison-table">
            <caption>Tabela comparativa complementar</caption>
            <thead>
              <tr>
                <th scope="col">Planta</th>
                <th scope="col">Interconexao</th>
                <th scope="col">Inicio de operacao</th>
                <th scope="col">Bateria</th>
                <th scope="col">Proprietario</th>
                <th scope="col">Telefone</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="station in stations" :key="`table-${station.idKey}`">
                <td>{{ station.name }}</td>
                <td>{{ station.gridInterconnectionType }}</td>
                <td>{{ station.startOperatingTime }}</td>
                <td>{{ station.batterySoc }}</td>
                <td>{{ station.ownerName }}</td>
                <td>{{ station.contactPhone }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <nav class="pagination" aria-label="Paginacao de plantas">
          <button
            type="button"
            class="secondary-button"
            :disabled="!hasPreviousPage || isLoadingStations"
            @click="goToPreviousPage"
          >
            Anterior
          </button>
          <span class="page-label">Pagina {{ currentPage }}</span>
          <button
            type="button"
            class="secondary-button"
            :disabled="!hasNextPage || isLoadingStations"
            @click="goToNextPage"
          >
            Proxima
          </button>
        </nav>
      </section>
    </main>
  </div>
</template>
