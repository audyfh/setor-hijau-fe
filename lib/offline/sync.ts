import {
  syncDeposits,
  type BatchSyncResponse,
  type CreateDepositRequest,
} from "@/lib/api/deposits";
import {
  listOfflineDeposits,
  removeOfflineDeposit,
  updateOfflineDepositStatus,
  type QueuedDeposit,
} from "@/lib/offline/db";

export interface OutboxFlushSummary {
  total: number;
  createdCount: number;
  replayedCount: number;
  errorCount: number;
  syncedDepositIds: string[];
}

export interface OutboxSyncDeps {
  listOutbox?: () => Promise<QueuedDeposit[]>;
  syncFn?: (deposits: CreateDepositRequest[]) => Promise<BatchSyncResponse>;
  updateStatus?: (
    idempotencyKey: string,
    status: QueuedDeposit["status"],
    errorMessage?: string,
  ) => Promise<void>;
  removeItem?: (idempotencyKey: string) => Promise<void>;
}

/**
 * Generates a client-side UUIDv4 idempotency_key at the exact moment of weighing/recording.
 */
export function generateIdempotencyKey(): string {
  if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function toCreateDepositRequest(item: QueuedDeposit): CreateDepositRequest {
  return {
    nasabah_id: item.nasabah_id,
    idempotency_key: item.idempotency_key,
    client_recorded_at: item.client_recorded_at,
    ...(item.notes?.trim() ? { notes: item.notes.trim() } : {}),
    lines: item.lines.map((line) => ({
      material_type_id: line.material_type_id,
      weight_grams: line.weight_grams,
    })),
  };
}

let activeSyncPromise: Promise<OutboxFlushSummary> | null = null;

async function executeFlush(deps: OutboxSyncDeps = {}): Promise<OutboxFlushSummary> {
  const listOutbox = deps.listOutbox ?? listOfflineDeposits;
  const syncFn = deps.syncFn ?? syncDeposits;
  const updateStatus = deps.updateStatus ?? updateOfflineDepositStatus;
  const removeItem = deps.removeItem ?? removeOfflineDeposit;

  const queued = await listOutbox();
  const eligible = queued.filter((item) => item.status === "pending" || item.status === "error");

  if (eligible.length === 0) {
    return {
      total: 0,
      createdCount: 0,
      replayedCount: 0,
      errorCount: 0,
      syncedDepositIds: [],
    };
  }

  for (const item of eligible) {
    await updateStatus(item.idempotency_key, "syncing");
  }

  try {
    const payloads = eligible.map(toCreateDepositRequest);
    const response = await syncFn(payloads);
    const resultMap = new Map(response.results.map((r) => [r.idempotency_key, r]));

    let createdCount = 0;
    let replayedCount = 0;
    let errorCount = 0;
    const syncedDepositIds: string[] = [];

    for (const item of eligible) {
      const outcome = resultMap.get(item.idempotency_key);
      if (!outcome) {
        await updateStatus(item.idempotency_key, "pending");
        continue;
      }

      if (outcome.status === "created" || outcome.status === "replayed") {
        await removeItem(item.idempotency_key);
        if (outcome.status === "created") {
          createdCount += 1;
        } else {
          replayedCount += 1;
        }
        const resolvedId = outcome.deposit?.id ?? outcome.deposit_id;
        if (resolvedId) {
          syncedDepositIds.push(resolvedId);
        }
      } else {
        errorCount += 1;
        await updateStatus(
          item.idempotency_key,
          "error",
          outcome.error || "Gagal menyinkronkan setoran.",
        );
      }
    }

    return {
      total: eligible.length,
      createdCount,
      replayedCount,
      errorCount,
      syncedDepositIds,
    };
  } catch (error) {
    for (const item of eligible) {
      await updateStatus(item.idempotency_key, "pending");
    }
    throw error;
  }
}

/**
 * Single-flight flush of the IndexedDB offline deposit outbox via POST /api/v1/deposits/sync.
 */
export async function flushDepositOutbox(deps?: OutboxSyncDeps): Promise<OutboxFlushSummary> {
  if (deps) {
    return executeFlush(deps);
  }
  if (activeSyncPromise) {
    return activeSyncPromise;
  }
  activeSyncPromise = executeFlush().finally(() => {
    activeSyncPromise = null;
  });
  return activeSyncPromise;
}
