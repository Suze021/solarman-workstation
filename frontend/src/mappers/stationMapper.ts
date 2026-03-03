import type { StationApi, StationViewModel } from "../types/station";
import {
  formatDateTime,
  formatNumber,
  formatValue,
  toGenerationPowerKw,
  toNumber,
} from "../utils/stationFormatters";

export function normalizeStation(
  station: StationApi,
  index: number
): StationViewModel {
  const generationPowerKw = toGenerationPowerKw(station.generationPower);
  const installedCapacityKw = toNumber(station.installedCapacity);
  // Formula combinada com o usuario: (geracao atual / capacidade instalada) * 100.
  const utilizationPercent =
    generationPowerKw !== null &&
    installedCapacityKw !== null &&
    installedCapacityKw > 0
      ? (generationPowerKw / installedCapacityKw) * 100
      : null;
  const batterySocValue = toNumber(station.batterySoc);
  // Fallback para indice local quando o id nao vier no payload.
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
      batterySocValue === null ? "Nao informado" : `${formatNumber(batterySocValue)}%`,
    ownerName: formatValue(station.ownerName),
    contactPhone: formatValue(station.contactPhone),
  };
}
