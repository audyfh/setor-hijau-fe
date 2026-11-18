declare module "@tgwf/co2" {
  export interface CO2Options {
    model?: "swd" | "1byte";
    version?: 3 | 4;
    results?: "segment";
    rating?: boolean;
  }

  export interface CO2SegmentResults {
    dataCenterOperationalCO2e: number;
    networkOperationalCO2e: number;
    consumerDeviceOperationalCO2e: number;
    dataCenterEmbodiedCO2e: number;
    networkEmbodiedCO2e: number;
    consumerDeviceEmbodiedCO2e: number;
    totalEmbodiedCO2e: number;
    totalOperationalCO2e: number;
    dataCenterCO2e: number;
    networkCO2e: number;
    consumerDeviceCO2e: number;
    total: number;
    rating?: string | null;
  }

  export interface CO2TraceResult {
    co2: number | CO2SegmentResults;
    green: boolean;
    variables: Record<string, unknown>;
  }

  export class co2 {
    constructor(options?: CO2Options);
    perByte(bytes: number, green?: boolean): number | CO2SegmentResults;
    perVisit(bytes: number, green?: boolean): number | CO2SegmentResults;
    perByteTrace(
      bytes: number,
      green?: boolean,
      options?: Record<string, unknown>,
    ): CO2TraceResult;
    perVisitTrace(
      bytes: number,
      green?: boolean,
      options?: Record<string, unknown>,
    ): CO2TraceResult;
  }

  export const hosting: {
    check(domain: string | string[], dbName?: string): Promise<boolean | string[]>;
  };
  export const averageIntensity: { data: Record<string, number>; type: string };
  export const marginalIntensity: { data: Record<string, number>; type: string };
  export const electricityMaps: unknown;
}
