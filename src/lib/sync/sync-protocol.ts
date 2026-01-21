import type { SyncPayload } from "@/types/flexi-tracker";

export type SyncMessage =
  | { type: "SYNC_REQUEST"; payload: SyncPayload }
  | { type: "SYNC_RESPONSE"; payload: SyncPayload }
  | { type: "SYNC_COMPLETE" };

export function createSyncRequest(payload: SyncPayload): SyncMessage {
  return { type: "SYNC_REQUEST", payload };
}

export function createSyncResponse(payload: SyncPayload): SyncMessage {
  return { type: "SYNC_RESPONSE", payload };
}

export function createSyncComplete(): SyncMessage {
  return { type: "SYNC_COMPLETE" };
}

export function isSyncMessage(data: unknown): data is SyncMessage {
  if (!data || typeof data !== "object") return false;
  const msg = data as { type?: string };
  return (
    msg.type === "SYNC_REQUEST" || msg.type === "SYNC_RESPONSE" || msg.type === "SYNC_COMPLETE"
  );
}

export function validateSyncPayload(payload: unknown): payload is SyncPayload {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Partial<SyncPayload>;
  return (
    typeof p.entries === "object" &&
    p.entries !== null &&
    Array.isArray(p.adjustments) &&
    typeof p.settings === "object" &&
    p.settings !== null &&
    typeof p.timestamp === "number"
  );
}
