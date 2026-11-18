import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_API_BASE_URL, getEnv, normalizeBaseUrl } from "@/lib/config/env";

describe("Environment configuration", () => {
  const originalApiUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  afterEach(() => {
    if (originalApiUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_BASE_URL;
    } else {
      process.env.NEXT_PUBLIC_API_BASE_URL = originalApiUrl;
    }
  });

  it("normalizes trailing slashes and defaults to live Cloud Run backend", () => {
    expect(normalizeBaseUrl(undefined)).toBe(DEFAULT_API_BASE_URL);
    expect(normalizeBaseUrl("   ")).toBe(DEFAULT_API_BASE_URL);
    expect(normalizeBaseUrl("https://prod-setor-hijau.cloud.run/")).toBe(
      "https://prod-setor-hijau.cloud.run",
    );
    expect(normalizeBaseUrl("http://localhost:8080///")).toBe("http://localhost:8080");
  });

  it("reads NEXT_PUBLIC_API_BASE_URL via getEnv()", () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://prod-setor-hijau.cloud.run/";
    expect(getEnv().apiBaseUrl).toBe("https://prod-setor-hijau.cloud.run");
  });
});
