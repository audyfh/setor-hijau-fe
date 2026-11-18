import { afterEach, describe, expect, it, vi } from "vitest";
import {
  appendMaterialPrice,
  createMaterial,
  listMaterialPrices,
  listMaterials,
} from "@/lib/api/materials";
import {
  createNasabah,
  listNasabah,
  regenerateNasabahQr,
  resetNasabahPin,
  resetNasabahPassword,
} from "@/lib/api/nasabah";
import { setStoredSession } from "@/lib/auth/session";

function stubAuthSession() {
  const store = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
    },
  });
  setStoredSession({
    accessToken: "test-token",
    refreshToken: "test-refresh",
    user: {
      id: "u1",
      username: "admin",
      full_name: "Admin",
      role: "pengelola",
      bank_sampah_id: "t1",
    },
    tenant: null,
  });
}

describe("lib/api/nasabah & lib/api/materials", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("listNasabah passes search, rw, rt query parameters", async () => {
    stubAuthSession();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [{ id: "n1", full_name: "Siti", rw: "05" }], total: 1 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await listNasabah({ search: "Siti", rw: "05", rt: "01" });
    expect(res.items).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://prod-setor-hijau.cloud.run/api/v1/nasabah?search=Siti&rw=05&rt=01",
      expect.any(Object),
    );
  });

  it("createNasabah, regenerateQr, resetPassword, resetPin hit expected endpoints", async () => {
    stubAuthSession();
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ id: "n1", qr_token: "qr-new" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await createNasabah({
      username: "siti01",
      password: "Password123!",
      full_name: "Siti Aminah",
      rw: "05",
    });
    expect(fetchMock).toHaveBeenLastCalledWith(
      "https://prod-setor-hijau.cloud.run/api/v1/nasabah",
      expect.objectContaining({ method: "POST" }),
    );

    await regenerateNasabahQr("n1");
    expect(fetchMock).toHaveBeenLastCalledWith(
      "https://prod-setor-hijau.cloud.run/api/v1/nasabah/n1/regenerate-qr",
      expect.objectContaining({ method: "POST" }),
    );

    await resetNasabahPassword("n1", "NewPass123!");
    expect(fetchMock).toHaveBeenLastCalledWith(
      "https://prod-setor-hijau.cloud.run/api/v1/nasabah/n1/reset-password",
      expect.objectContaining({ method: "POST" }),
    );

    await resetNasabahPin("n1", "123456");
    expect(fetchMock).toHaveBeenLastCalledWith(
      "https://prod-setor-hijau.cloud.run/api/v1/nasabah/n1/reset-pin",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("rejects non-integer or negative Rupiah prices in createMaterial and appendMaterialPrice", async () => {
    stubAuthSession();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createMaterial({
        name: "Botol PET",
        category: "plastik",
        price_per_kg_idr: 3500.5,
      }),
    ).rejects.toThrow(/bilangan bulat/);

    await expect(appendMaterialPrice("m1", -100)).rejects.toThrow(/bilangan bulat/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("listMaterials, appendMaterialPrice, and listMaterialPrices work with integer Rupiah", async () => {
    stubAuthSession();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ id: "m1", name: "Botol PET", price_per_kg_idr: 3500 }]), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "p2", price_per_kg_idr: 4000 }), {
          status: 201,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            { id: "p2", price_per_kg_idr: 4000 },
            { id: "p1", price_per_kg_idr: 3500 },
          ]),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const materials = await listMaterials();
    expect(materials[0]?.price_per_kg_idr).toBe(3500);

    const updated = await appendMaterialPrice("m1", 4000);
    expect(updated.price_per_kg_idr).toBe(4000);

    const history = await listMaterialPrices("m1");
    expect(history).toHaveLength(2);
  });
});
