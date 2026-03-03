<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { DEFAULT_PAGE_SIZE, TOKEN_STORAGE_KEY } from "./constants/app";
import { normalizeStation } from "./mappers/stationMapper";
import { authenticateAccount, requestStationsPage } from "./services/solarmanApi";
import type { StationViewModel } from "./types/station";
import { formatNumber } from "./utils/stationFormatters";

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
    return currentPage.value * DEFAULT_PAGE_SIZE < totalStations.value;
  }
  return stations.value.length >= DEFAULT_PAGE_SIZE;
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

async function fetchStations(page: number) {
  if (!accessToken.value) {
    stationsError.value = "Autentique-se antes de carregar a lista de plantas.";
    return;
  }

  stationsError.value = "";
  isLoadingStations.value = true;

  try {
    const { stationList, total } = await requestStationsPage({
      accessToken: accessToken.value,
      page,
      size: DEFAULT_PAGE_SIZE,
    });

    stations.value = stationList.map((station, index) =>
      normalizeStation(station, index)
    );
    totalStations.value = total;
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
    const token = await authenticateAccount();
    accessToken.value = token;
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    authSuccess.value = "Autenticacao concluida com sucesso.";
    await fetchStations(1);
  } catch (error) {
    authError.value =
      error instanceof Error
        ? error.message
        : "Erro inesperado durante a autenticacao.";
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

async function refreshStations() {
  await fetchStations(1);
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
          <p>Teste Tecnico: Integracao com API Solarman</p>
        </div>

        <details class="auth-menu">
          <summary class="auth-menu-trigger">Autenticacao</summary>
          <div class="auth-menu-content">
            <p class="auth-menu-title">Acoes da conta</p>
            <p class="auth-menu-subtitle">
              Credenciais no backend. Token reutilizado nas requisicoes.
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
                @click="refreshStations"
              >
                {{ isLoadingStations ? "Carregando..." : "Atualizar lista" }}
              </button>
            </div>
            <p class="auth-status" :class="{ connected: isAuthenticated }">
              {{ isAuthenticated ? "Conta autenticada" : "Conta nao autenticada" }}
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
            Pagina {{ currentPage }} <span v-if="totalLabel">| {{ totalLabel }}</span>
          </p>
        </div>

        <label class="toggle-line">
          <input v-model="showComparisonTable" type="checkbox" />
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
          Nenhuma planta encontrada para a pagina atual.
        </p>
        <p v-else-if="!isAuthenticated" class="feedback neutral">
          Abra o menu de autenticacao e autentique para visualizar as plantas.
        </p>

        <div v-if="stations.length > 0" class="cards-grid">
          <article v-for="station in stations" :key="station.idKey" class="station-card">
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
          <div class="comparison-header">
            <p class="comparison-title">Tabela comparativa complementar</p>
          </div>

          <table class="comparison-table">
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
