import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loginNasabahWithQr,
  loginWithPassword,
  normalizeTokenPairResponse,
  registerTenant,
} from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { authFetch } from "@/lib/auth/fetch-auth";
import {
  clearStoredSession,
  extractUserFromJwt,
  getStoredSession,
  setStoredSession,
} from "@/lib/auth/session";

function createFakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.signature`;
}

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

describe("lib/auth", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("extractUserFromJwt extracts pengelola and nasabah claims safely", () => {
    const token = createFakeJwt({
      user_id: "user-1",
      username: "admin_melati",
      role: "pengelola",
      bank_sampah_id: "tenant-1",
    });

    const user = extractUserFromJwt(token);
    expect(user).toEqual({
      id: "user-1",
      username: "admin_melati",
      full_name: "admin_melati",
      role: "pengelola",
      bank_sampah_id: "tenant-1",
    });

    expect(extractUserFromJwt("invalid-token")).toBeNull();
  });

  it("authFetch attaches Bearer token and rotates refresh token once on 401", async () => {
    const storage = createMemoryStorage();
    vi.stubGlobal("window", { localStorage: storage });

    setStoredSession({
      accessToken: "expired-access",
      refreshToken: "valid-refresh",
      user: {
        id: "u1",
        username: "admin",
        full_name: "Admin",
        role: "pengelola",
        bank_sampah_id: "t1",
      },
      tenant: null,
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "token expired" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "fresh-access",
            refresh_token: "fresh-refresh",
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "t1", name: "Bank Sampah Melati" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const tenant = await authFetch<{ id: string; name: string }>("/api/v1/tenants/current");
    expect(tenant.name).toBe("Bank Sampah Melati");
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const updated = getStoredSession();
    expect(updated?.accessToken).toBe("fresh-access");
    expect(updated?.refreshToken).toBe("fresh-refresh");

    clearStoredSession();
    expect(getStoredSession()).toBeNull();
  });

  it("authFetch clears session when refresh fails", async () => {
    const storage = createMemoryStorage();
    vi.stubGlobal("window", { localStorage: storage });

    setStoredSession({
      accessToken: "expired-access",
      refreshToken: "revoked-refresh",
      user: null,
      tenant: null,
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "invalid refresh" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    await expect(authFetch("/api/v1/auth/me")).rejects.toThrow(ApiError);
    expect(getStoredSession()).toBeNull();
  });

  it("auth API helpers target expected endpoints", async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ access_token: "a", refresh_token: "r" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await loginWithPassword({
      identifier: "warga01",
      password: "secret",
      bank_sampah_code: "BSM-RW05",
    });
    expect(fetchMock).toHaveBeenLastCalledWith(
      "https://prod-setor-hijau.cloud.run/api/v1/auth/login",
      expect.objectContaining({ method: "POST" }),
    );

    await loginNasabahWithQr({ qr_token: "qr-abc", pin: "123456" });
    expect(fetchMock).toHaveBeenLastCalledWith(
      "https://prod-setor-hijau.cloud.run/api/v1/auth/login/qr",
      expect.objectContaining({ method: "POST" }),
    );

    await registerTenant({
      name: "Bank Sampah Melati",
      code: "BSM-RW05",
      address: "Jl. Melati 1",
      rw: "05",
      kelurahan: "Lowokwaru",
      kecamatan: "Lowokwaru",
      kabupaten_kota: "Kota Malang",
      provinsi: "Jawa Timur",
      pengelola_username: "admin",
      pengelola_email: "admin@melati.id",
      pengelola_password: "Password123!",
      pengelola_full_name: "Budi",
    });
    expect(fetchMock).toHaveBeenLastCalledWith(
      "https://prod-setor-hijau.cloud.run/api/v1/tenants/register",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("normalizeTokenPairResponse extracts tokens from flat or nested envelopes", () => {
    expect(
      normalizeTokenPairResponse({
        data: { access_token: "acc-1", refresh_token: "ref-1" },
      }),
    ).toMatchObject({ access_token: "acc-1", refresh_token: "ref-1" });

    expect(
      normalizeTokenPairResponse({
        tokens: { access_token: "acc-2", refresh_token: "ref-2" },
        user: { id: "u1", username: "admin", full_name: "Admin", role: "pengelola", bank_sampah_id: "t1" },
      }),
    ).toMatchObject({ access_token: "acc-2", refresh_token: "ref-2" });

    expect(() => normalizeTokenPairResponse({ message: "ok" })).toThrow(/access_token/);
  });
});
