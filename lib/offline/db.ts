import type { CarbonFactorOption, MaterialItem } from "@/lib/api/materials";
import type { NasabahItem } from "@/lib/api/nasabah";

const DB_NAME = "setor_hijau_offline_v1";
const DB_VERSION = 1;

const STORE_NASABAH = "nasabah_cache";
const STORE_MATERIALS = "materials_cache";
const STORE_FACTORS = "carbon_factors_cache";
const STORE_OUTBOX = "deposit_outbox";
const STORE_META = "meta";

export interface OutboxLineItem {
  material_type_id: string;
  material_name?: string;
  weight_grams: number;
  price_per_kg_idr?: number;
  co2e_factor_ppm?: number;
}

export interface QueuedDeposit {
  idempotency_key: string;
  client_recorded_at: string;
  nasabah_id: string;
  nasabah_name: string;
  notes?: string;
  lines: OutboxLineItem[];
  total_weight_grams: number;
  estimated_amount_idr: number;
  estimated_co2e_grams: number;
  status: "pending" | "syncing" | "error";
  error_message?: string;
  created_at: string;
}

export interface CacheMeta {
  key: string;
  updated_at: string;
  count?: number;
}

export function isIndexedDbAvailable(): boolean {
  return typeof globalThis !== "undefined" && typeof globalThis.indexedDB !== "undefined";
}

function openOfflineDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDbAvailable()) {
      reject(new Error("IndexedDB tidak tersedia di lingkungan ini."));
      return;
    }

    const request = globalThis.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NASABAH)) {
        db.createObjectStore(STORE_NASABAH, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_MATERIALS)) {
        db.createObjectStore(STORE_MATERIALS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_FACTORS)) {
        db.createObjectStore(STORE_FACTORS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_OUTBOX)) {
        db.createObjectStore(STORE_OUTBOX, { keyPath: "idempotency_key" });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Gagal membuka IndexedDB."));
  });
}

function runTx<T>(
  storeNames: string | string[],
  mode: IDBTransactionMode,
  executor: (tx: IDBTransaction) => Promise<T> | T,
): Promise<T> {
  return openOfflineDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(storeNames, mode);
        let resultValue: T;

        Promise.resolve(executor(tx))
          .then((val) => {
            resultValue = val;
          })
          .catch((err) => {
            try {
              tx.abort();
            } catch {
              // ignore abort error
            }
            reject(err);
          });

        tx.oncomplete = () => {
          db.close();
          resolve(resultValue);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error ?? new Error("Transaksi IndexedDB gagal."));
        };
        tx.onabort = () => {
          db.close();
          reject(tx.error ?? new Error("Transaksi IndexedDB dibatalkan."));
        };
      }),
  );
}

function reqToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Permintaan IndexedDB gagal."));
  });
}

export async function cacheReferenceData(params: {
  nasabah?: NasabahItem[];
  materials?: MaterialItem[];
  factors?: CarbonFactorOption[];
}): Promise<void> {
  if (!isIndexedDbAvailable()) return;

  const storesToOpen: string[] = [STORE_META];
  if (params.nasabah) storesToOpen.push(STORE_NASABAH);
  if (params.materials) storesToOpen.push(STORE_MATERIALS);
  if (params.factors) storesToOpen.push(STORE_FACTORS);

  const now = new Date().toISOString();

  await runTx(storesToOpen, "readwrite", (tx) => {
    if (params.nasabah) {
      const store = tx.objectStore(STORE_NASABAH);
      store.clear();
      for (const item of params.nasabah) {
        store.put(item);
      }
      tx.objectStore(STORE_META).put({
        key: "nasabah_cached_at",
        updated_at: now,
        count: params.nasabah.length,
      } satisfies CacheMeta);
    }

    if (params.materials) {
      const store = tx.objectStore(STORE_MATERIALS);
      store.clear();
      for (const item of params.materials) {
        store.put(item);
      }
      tx.objectStore(STORE_META).put({
        key: "materials_cached_at",
        updated_at: now,
        count: params.materials.length,
      } satisfies CacheMeta);
    }

    if (params.factors) {
      const store = tx.objectStore(STORE_FACTORS);
      store.clear();
      for (const item of params.factors) {
        store.put(item);
      }
    }
  });
}

export async function getCachedReferenceData(): Promise<{
  nasabah: NasabahItem[];
  materials: MaterialItem[];
  factors: CarbonFactorOption[];
  lastCachedAt: string | null;
}> {
  if (!isIndexedDbAvailable()) {
    return { nasabah: [], materials: [], factors: [], lastCachedAt: null };
  }

  return runTx(
    [STORE_NASABAH, STORE_MATERIALS, STORE_FACTORS, STORE_META],
    "readonly",
    async (tx) => {
      const [nasabah, materials, factors, meta] = await Promise.all([
        reqToPromise<NasabahItem[]>(tx.objectStore(STORE_NASABAH).getAll()),
        reqToPromise<MaterialItem[]>(tx.objectStore(STORE_MATERIALS).getAll()),
        reqToPromise<CarbonFactorOption[]>(tx.objectStore(STORE_FACTORS).getAll()),
        reqToPromise<CacheMeta | undefined>(
          tx.objectStore(STORE_META).get("materials_cached_at"),
        ),
      ]);
      return {
        nasabah: nasabah ?? [],
        materials: materials ?? [],
        factors: factors ?? [],
        lastCachedAt: meta?.updated_at ?? null,
      };
    },
  );
}

export async function enqueueOfflineDeposit(deposit: QueuedDeposit): Promise<void> {
  if (!isIndexedDbAvailable()) {
    throw new Error("Browser tidak mendukung penyimpanan offline (IndexedDB).");
  }
  await runTx(STORE_OUTBOX, "readwrite", (tx) => {
    tx.objectStore(STORE_OUTBOX).put(deposit);
  });
}

export async function listOfflineDeposits(): Promise<QueuedDeposit[]> {
  if (!isIndexedDbAvailable()) return [];
  const items = await runTx(STORE_OUTBOX, "readonly", (tx) =>
    reqToPromise<QueuedDeposit[]>(tx.objectStore(STORE_OUTBOX).getAll()),
  );
  return (items ?? []).sort((a, b) =>
    b.client_recorded_at.localeCompare(a.client_recorded_at),
  );
}

export async function updateOfflineDepositStatus(
  idempotencyKey: string,
  status: QueuedDeposit["status"],
  errorMessage?: string,
): Promise<void> {
  if (!isIndexedDbAvailable()) return;
  await runTx(STORE_OUTBOX, "readwrite", async (tx) => {
    const store = tx.objectStore(STORE_OUTBOX);
    const existing = await reqToPromise<QueuedDeposit | undefined>(store.get(idempotencyKey));
    if (!existing) return;
    store.put({
      ...existing,
      status,
      error_message: errorMessage,
    } satisfies QueuedDeposit);
  });
}

export async function removeOfflineDeposit(idempotencyKey: string): Promise<void> {
  if (!isIndexedDbAvailable()) return;
  await runTx(STORE_OUTBOX, "readwrite", (tx) => {
    tx.objectStore(STORE_OUTBOX).delete(idempotencyKey);
  });
}
