import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import {
  fetchPublicImpact,
  fetchPublicMethods,
  fetchTenantPublicImpact,
} from "@/lib/api/public";

describe("lib/api/public", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("fetchPublicImpact requests /api/v1/public/impact with no-store cache", async () => {
    const mockImpact = {
      scope: "platform",
      total_recycled_weight_grams: 12500,
      total_recycled_weight_kg: 12.5,
      total_avoided_co2e_grams: 25000,
      total_avoided_co2e_kg: 25,
      total_data_bytes_transferred: 500000,
      total_data_megabytes: 0.5,
      total_digital_footprint_co2e_grams: 18,
      total_digital_footprint_co2e_kg: 0.018,
      net_impact_co2e_grams: 24982,
      net_impact_co2e_kg: 24.982,
      sustainability_ratio: 1388.88,
      avoided_categories: null,
      digital_footprint_segments: {
        data_center_co2e_grams: 3,
        network_co2e_grams: 2,
        user_device_co2e_grams: 9,
        embodied_hardware_co2e_grams: 4,
      },
      model_citations: {
        avoided_emissions_model: "US EPA WARM v16",
        digital_footprint_model: "SWDM v4",
      },
    };

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockImpact), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchPublicImpact();
    expect(result.scope).toBe("platform");
    expect(result.net_impact_co2e_grams).toBe(24982);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://prod-setor-hijau.cloud.run/api/v1/public/impact",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("fetchTenantPublicImpact trims and encodes tenant code", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ scope: "tenant", tenant_code: "RW05-MELATI" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchTenantPublicImpact("  RW05-MELATI  ");
    expect(result.tenant_code).toBe("RW05-MELATI");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://prod-setor-hijau.cloud.run/api/v1/public/impact/tenants/RW05-MELATI",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("fetchTenantPublicImpact rejects empty code before calling fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchTenantPublicImpact("   ")).rejects.toThrow(ApiError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetchPublicMethods requests /api/v1/public/methods", async () => {
    const mockMethods = {
      title: "Metodologi & Sumber Akuntansi Karbon Setor Hijau",
      academic_statement: "Pernyataan akademik",
      warm_model: {
        version: "WARM Version 16",
        source_citation: "US EPA",
        baseline_scenario: "Landfill vs Recycling",
        target_materials: [],
      },
      swdm_model: {
        model_version: "SWDM Version 4",
        model_source: "CO2.js",
        operational_energy_per_gb_kwh: 0.057,
        embodied_energy_per_gb_kwh: 0.015,
        total_energy_per_gb_kwh: 0.072,
        grid_carbon_intensity_g_per_kwh: 494,
        emissions_per_gb_g_co2e: 35.568,
        segments_breakdown_percent: {
          data_center_pct: 15,
          network_pct: 14,
          user_device_pct: 52,
          embodied_hardware_pct: 19,
        },
      },
      formulas: {
        avoided_co2e_formula: "f1",
        digital_footprint_formula: "f2",
        net_impact_formula: "f3",
        sustainability_ratio_formula: "f4",
      },
      assumptions_and_limitations: [],
    };

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockMethods), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchPublicMethods();
    expect(result.title).toContain("Metodologi");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://prod-setor-hijau.cloud.run/api/v1/public/methods",
      expect.objectContaining({ cache: "no-store" }),
    );
  });
});
