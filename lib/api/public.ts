import { apiFetch, ApiError } from "@/lib/api/client";

export interface AvoidedCategoryBreakdown {
  category: string;
  weight_grams: number;
  avoided_co2e_grams: number;
}

export interface DigitalFootprintSegments {
  data_center_co2e_grams: number;
  network_co2e_grams: number;
  user_device_co2e_grams: number;
  embodied_hardware_co2e_grams: number;
}

export interface ImpactModelCitations {
  avoided_emissions_model: string;
  digital_footprint_model: string;
}

export interface PublicImpactResponse {
  scope: string;
  tenant_code?: string;
  tenant_name?: string;
  total_recycled_weight_grams: number;
  total_recycled_weight_kg: number;
  total_avoided_co2e_grams: number;
  total_avoided_co2e_kg: number;
  total_data_bytes_transferred: number;
  total_data_megabytes: number;
  total_digital_footprint_co2e_grams: number;
  total_digital_footprint_co2e_kg: number;
  net_impact_co2e_grams: number;
  net_impact_co2e_kg: number;
  sustainability_ratio: number;
  avoided_categories: AvoidedCategoryBreakdown[] | null;
  digital_footprint_segments: DigitalFootprintSegments;
  model_citations: ImpactModelCitations;
}

export interface WarmTargetMaterial {
  id: string;
  material_code: string;
  name: string;
  category: string;
  factor_version: string;
  factor_source: string;
  co2e_factor_ppm: number;
  metric_ton_co2e_per_metric_ton: number;
  description: string;
}

export interface SwdmSegmentsPercent {
  data_center_pct: number;
  network_pct: number;
  user_device_pct: number;
  embodied_hardware_pct: number;
}

export interface PublicMethodsResponse {
  title: string;
  academic_statement: string;
  warm_model: {
    version: string;
    source_citation: string;
    baseline_scenario: string;
    target_materials: WarmTargetMaterial[];
  };
  swdm_model: {
    model_version: string;
    model_source: string;
    operational_energy_per_gb_kwh: number;
    embodied_energy_per_gb_kwh: number;
    total_energy_per_gb_kwh: number;
    grid_carbon_intensity_g_per_kwh: number;
    emissions_per_gb_g_co2e: number;
    segments_breakdown_percent: SwdmSegmentsPercent;
  };
  formulas: {
    avoided_co2e_formula: string;
    digital_footprint_formula: string;
    net_impact_formula: string;
    sustainability_ratio_formula: string;
  };
  assumptions_and_limitations: string[];
}

/**
 * Fetches platform-wide Net Impact Meter metrics from GET /api/v1/public/impact.
 */
export async function fetchPublicImpact(init?: RequestInit): Promise<PublicImpactResponse> {
  return apiFetch<PublicImpactResponse>("/api/v1/public/impact", {
    cache: "no-store",
    ...init,
  });
}

/**
 * Fetches Net Impact Meter metrics for a specific bank sampah code.
 */
export async function fetchTenantPublicImpact(
  tenantCode: string,
  init?: RequestInit,
): Promise<PublicImpactResponse> {
  const normalizedCode = tenantCode.trim();
  if (!normalizedCode) {
    throw new ApiError(400, "Kode bank sampah wajib diisi.");
  }

  return apiFetch<PublicImpactResponse>(
    `/api/v1/public/impact/tenants/${encodeURIComponent(normalizedCode)}`,
    {
      cache: "no-store",
      ...init,
    },
  );
}

/**
 * Fetches public carbon methodology, WARM v16 factors, SWDM v4 parameters,
 * formulas, and academic disclaimers from GET /api/v1/public/methods.
 */
export async function fetchPublicMethods(init?: RequestInit): Promise<PublicMethodsResponse> {
  return apiFetch<PublicMethodsResponse>("/api/v1/public/methods", {
    cache: "no-store",
    ...init,
  });
}
