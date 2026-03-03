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

const isAuthenticated = computed(() => Boolean(accessToken.value));

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
  return numericValue < 1_000_000_000_000 ? numericValue * 1000 : numericValue;
}

function formatDateTime(value: unknown): string {
  const epochMs = normalizeEpochMilliseconds(value);
  if (epochMs === null) {
    return "Não informado";
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
  return safeValue ? safeValue : "Não informado";
}

function formatNumber(value: number | null, fractionDigits = 2): string {
  if (value === null) {
    return "Não informado";
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
  const batterySocValue = toNumber(station.batterySoc);

  const baseId = typeof station.id === "number" ? String(station.id) : String(index);

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
    batterySoc:
      batterySocValue === null ? "Não informado" : `${formatNumber(batterySocValue)}%`,
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
    stationsError.value = "Autentique-se antes de carregar a lista de plantas.";
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
      throw new Error(getErrorMessage(payload, "Falha ao carregar a lista de plantas."));
    }

    if (!Array.isArray(payload.stationList)) {
      throw new Error("A resposta da lista de plantas é inválida.");
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
        : "Erro inesperado ao carregar as plantas.";
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
      throw new Error(getErrorMessage(payload, "Falha na autenticação."));
    }

    const token =
      payload && typeof payload === "object" && "accessToken" in payload
        ? String((payload as { accessToken?: string }).accessToken || "")
        : "";

    if (!token) {
      throw new Error("A resposta de autenticação não incluiu accessToken.");
    }

    accessToken.value = token;
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    authSuccess.value = "Autenticação concluída com sucesso.";
    await fetchStations(1);
  } catch (error) {
    authError.value =
      error instanceof Error
        ? error.message
        : "Erro inesperado durante a autenticação.";
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
      <div class="topbar-content">
        <div class="title-block">
          <h1>Solarman Workstation</h1>
          <p>Teste Técnico: Integração com API Solarman</p>
        </div>

        <details class="auth-menu">
          <summary class="auth-menu-trigger">Autenticação</summary>
          <div class="auth-menu-content">
            <p class="auth-menu-title">Ações da conta</p>
            <p class="auth-menu-subtitle">
              Credenciais no backend. Token reutilizado nas requisições.
            </p>
            <div class="auth-actions">
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
                :disabled="isAuthenticating || !isAuthenticated"
                @click="clearStoredToken"
              >
                Limpar token
              </button>
              <button
                type="button"
                class="secondary-button"
                :disabled="!isAuthenticated || isLoadingStations"
                @click="fetchStations(1)"
              >
                {{ isLoadingStations ? "Carregando..." : "Atualizar lista" }}
              </button>
            </div>
            <p class="auth-status" :class="{ connected: isAuthenticated }">
              {{ isAuthenticated ? "Conta autenticada" : "Conta não autenticada" }}
            </p>
            <p v-if="authSuccess" class="feedback success">{{ authSuccess }}</p>
            <p v-if="authError" class="feedback error">{{ authError }}</p>
          </div>
        </details>
      </div>
    </header>

    <main class="content" aria-live="polite">
      <section class="panel" aria-label="Lista de plantas solares">
        <div class="section-header">
          <h2>Plantas solares</h2>
          <p class="muted">
            Página {{ currentPage }} <span v-if="totalLabel">| {{ totalLabel }}</span>
          </p>
        </div>

        <label class="toggle-line">
          <input type="checkbox" v-model="showComparisonTable" />
          Mostrar tabela comparativa (campos complementares).
        </label>

        <p v-if="stationsError" class="feedback error">{{ stationsError }}</p>
        <p v-else-if="isLoadingStations" class="feedback neutral">
          Carregando lista de plantas...
        </p>
        <p
          v-else-if="isAuthenticated && stations.length === 0"
          class="feedback neutral"
        >
          Nenhuma planta encontrada para a página atual.
        </p>
        <p v-else-if="!isAuthenticated" class="feedback neutral">
          Abra o menu de autenticação e autentique para visualizar as plantas.
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
                  online:
                    station.networkStatus.includes('ONLINE') &&
                    !station.networkStatus.includes('OFFLINE'),
                  offline: station.networkStatus.includes('OFFLINE')
                }"
              >
                {{ station.networkStatus }}
              </span>
            </header>

            <dl class="station-fields">
              <div>
                <dt>Endereço</dt>
                <dd>{{ station.locationAddress }}</dd>
              </div>
              <div>
                <dt>Geração atual (kW)</dt>
                <dd>{{ formatNumber(station.generationPowerKw) }}</dd>
              </div>
              <div>
                <dt>Capacidade instalada (kW)</dt>
                <dd>{{ formatNumber(station.installedCapacityKw) }}</dd>
              </div>
              <div>
                <dt>Taxa de utilização</dt>
                <dd>
                  {{
                    station.utilizationPercent === null
                      ? "Não informado"
                      : `${formatNumber(station.utilizationPercent)}%`
                  }}
                </dd>
              </div>
              <div>
                <dt>Tipo de planta</dt>
                <dd>{{ station.type }}</dd>
              </div>
              <div>
                <dt>Tipo de interconexão</dt>
                <dd>{{ station.gridInterconnectionType }}</dd>
              </div>
              <div>
                <dt>Início de operação</dt>
                <dd>{{ station.startOperatingTime }}</dd>
              </div>
              <div>
                <dt>Última atualização</dt>
                <dd>{{ station.lastUpdateTime }}</dd>
              </div>
              <div>
                <dt>Nível de bateria</dt>
                <dd>{{ station.batterySoc }}</dd>
              </div>
              <div>
                <dt>Proprietário</dt>
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
          <div class="comparison-header">
            <p class="comparison-title">Tabela comparativa complementar</p>
          </div>

          <table class="comparison-table">
            <thead>
              <tr>
                <th scope="col">Planta</th>
                <th scope="col">Interconexão</th>
                <th scope="col">Início de operação</th>
                <th scope="col">Bateria</th>
                <th scope="col">Proprietário</th>
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

        <nav class="pagination" aria-label="Paginação de plantas">
          <button
            type="button"
            class="secondary-button"
            :disabled="!hasPreviousPage || isLoadingStations"
            @click="goToPreviousPage"
          >
            Anterior
          </button>
          <span class="page-label">Página {{ currentPage }}</span>
          <button
            type="button"
            class="secondary-button"
            :disabled="!hasNextPage || isLoadingStations"
            @click="goToNextPage"
          >
            Próxima
          </button>
        </nav>
      </section>
    </main>
  </div>
</template>
