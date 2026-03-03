export interface StationApi {
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

export interface StationViewModel {
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
