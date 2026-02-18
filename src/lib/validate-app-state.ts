import type { AppState } from "@/types/flexi-tracker";

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

/**
 * Validates that imported data conforms to the AppState schema.
 * Returns an error message if invalid, or null if valid.
 */
export function validateAppState(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return "Invalid data: expected an object";
  }

  const d = data as Record<string, unknown>;

  // Validate settings (required)
  if (!d.settings || !isValidSettings(d.settings)) {
    return "Invalid or missing settings";
  }

  // Validate entries (required)
  if (typeof d.entries !== "object" || d.entries === null) {
    return "Invalid or missing entries";
  }
  const entries = d.entries as Record<string, unknown>;
  for (const key of Object.keys(entries)) {
    if (BLOCKED_KEYS.has(key)) {
      return `Invalid entry key: ${key}`;
    }
    if (!DATE_KEY_RE.test(key)) {
      return `Invalid entry date key: ${key}`;
    }
    if (!isValidDayEntry(entries[key])) {
      return `Invalid entry data for ${key}`;
    }
  }

  // Validate adjustments (required)
  if (!Array.isArray(d.adjustments)) {
    return "Invalid or missing adjustments";
  }
  for (let i = 0; i < d.adjustments.length; i++) {
    if (!isValidAdjustment(d.adjustments[i])) {
      return `Invalid adjustment at index ${i}`;
    }
  }

  // Validate leaveBalance (optional)
  if (d.leaveBalance != null) {
    if (typeof d.leaveBalance !== "object") {
      return "Invalid leave balance";
    }
    const lb = d.leaveBalance as Record<string, unknown>;
    if (
      typeof lb.totalDays !== "number" ||
      typeof lb.periodStart !== "string" ||
      typeof lb.periodEnd !== "string"
    ) {
      return "Invalid leave balance fields";
    }
  }

  return null;
}

/**
 * Type guard that checks if data is a valid AppState.
 */
export function isValidAppState(data: unknown): data is AppState {
  return validateAppState(data) === null;
}
