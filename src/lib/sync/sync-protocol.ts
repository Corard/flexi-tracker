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

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const VALID_DAY_TYPES = new Set([
  "normal",
  "sick",
  "sick-half",
  "holiday",
  "holiday-half",
  "flexi",
  "flexi-half",
]);
const MAX_ENTRIES = 10000;
const MAX_ADJUSTMENTS = 5000;
const BLOCKED_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function isValidDayEntry(entry: unknown): boolean {
  if (!entry || typeof entry !== "object") return false;
  const e = entry as Record<string, unknown>;
  if (e.startTime != null && (typeof e.startTime !== "string" || !TIME_RE.test(e.startTime)))
    return false;
  if (e.endTime != null && (typeof e.endTime !== "string" || !TIME_RE.test(e.endTime)))
    return false;
  if (e.breakMinutes != null && (typeof e.breakMinutes !== "number" || e.breakMinutes < 0))
    return false;
  if (e.dayType != null && (typeof e.dayType !== "string" || !VALID_DAY_TYPES.has(e.dayType)))
    return false;
  return true;
}

function isValidAdjustment(adj: unknown): boolean {
  if (!adj || typeof adj !== "object") return false;
  const a = adj as Record<string, unknown>;
  return (
    typeof a.id === "string" &&
    typeof a.date === "string" &&
    DATE_KEY_RE.test(a.date) &&
    typeof a.minutes === "number" &&
    typeof a.note === "string"
  );
}

function isValidSettings(settings: unknown): boolean {
  if (!settings || typeof settings !== "object") return false;
  const s = settings as Record<string, unknown>;
  return (
    Array.isArray(s.workingDays) &&
    s.workingDays.every((d: unknown) => typeof d === "number" && d >= 0 && d <= 6) &&
    typeof s.expectedMinutesPerDay === "number" &&
    s.expectedMinutesPerDay >= 0 &&
    typeof s.weekStartsOn === "number" &&
    (s.weekStartsOn === 0 || s.weekStartsOn === 1) &&
    typeof s.nonWorkingDayDisplay === "string" &&
    typeof s.nonWorkingDayRate === "number"
  );
}

export function validateSyncPayload(payload: unknown): payload is SyncPayload {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Partial<SyncPayload>;

  // Top-level structure checks
  if (
    typeof p.entries !== "object" ||
    p.entries === null ||
    !Array.isArray(p.adjustments) ||
    typeof p.settings !== "object" ||
    p.settings === null ||
    typeof p.timestamp !== "number"
  )
    return false;

  // Size limits to prevent DoS
  const entryKeys = Object.keys(p.entries);
  if (entryKeys.length > MAX_ENTRIES) return false;
  if (p.adjustments.length > MAX_ADJUSTMENTS) return false;

  // Validate entry keys are date strings and values are valid, block prototype pollution
  for (const key of entryKeys) {
    if (BLOCKED_KEYS.has(key)) return false;
    if (!DATE_KEY_RE.test(key)) return false;
    if (!isValidDayEntry(p.entries[key])) return false;
  }

  // Validate adjustments
  for (const adj of p.adjustments) {
    if (!isValidAdjustment(adj)) return false;
  }

  // Validate settings
  if (!isValidSettings(p.settings)) return false;

  return true;
}
