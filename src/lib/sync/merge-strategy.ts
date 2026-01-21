import type {
  DayEntry,
  Adjustment,
  SyncPayload,
  ConflictEntry,
  SyncResult,
} from "@/types/flexi-tracker";

function entriesAreEqual(a: DayEntry, b: DayEntry): boolean {
  return (
    a.startTime === b.startTime &&
    a.endTime === b.endTime &&
    a.breakMinutes === b.breakMinutes &&
    a.dayType === b.dayType
  );
}

function entryIsEmpty(entry: DayEntry | undefined): boolean {
  if (!entry) return true;
  return !entry.startTime && !entry.endTime && !entry.breakMinutes && !entry.dayType;
}

export function detectConflicts(
  local: Record<string, DayEntry>,
  remote: Record<string, DayEntry>
): ConflictEntry[] {
  const conflicts: ConflictEntry[] = [];
  const allDates = new Set([...Object.keys(local), ...Object.keys(remote)]);

  for (const date of allDates) {
    const localEntry = local[date];
    const remoteEntry = remote[date];

    const localEmpty = entryIsEmpty(localEntry);
    const remoteEmpty = entryIsEmpty(remoteEntry);

    // Both have data and they differ = conflict
    if (!localEmpty && !remoteEmpty && !entriesAreEqual(localEntry, remoteEntry)) {
      conflicts.push({
        date,
        local: localEntry,
        remote: remoteEntry,
      });
    }
  }

  return conflicts;
}

export function mergeNonConflicting(
  local: Record<string, DayEntry>,
  remote: Record<string, DayEntry>,
  conflicts: ConflictEntry[]
): Record<string, DayEntry> {
  const conflictDates = new Set(conflicts.map((c) => c.date));
  const merged: Record<string, DayEntry> = {};
  const allDates = new Set([...Object.keys(local), ...Object.keys(remote)]);

  for (const date of allDates) {
    // Skip conflicts - they'll be resolved separately
    if (conflictDates.has(date)) continue;

    const localEntry = local[date];
    const remoteEntry = remote[date];

    const localEmpty = entryIsEmpty(localEntry);
    const remoteEmpty = entryIsEmpty(remoteEntry);

    if (!localEmpty && remoteEmpty) {
      // Only local has data
      merged[date] = localEntry;
    } else if (localEmpty && !remoteEmpty) {
      // Only remote has data
      merged[date] = remoteEntry;
    } else if (!localEmpty && !remoteEmpty) {
      // Both have same data (not a conflict)
      merged[date] = localEntry;
    }
    // If both empty, skip
  }

  return merged;
}

export function applyResolutions(
  merged: Record<string, DayEntry>,
  resolutions: Map<string, "local" | "remote">,
  conflicts: ConflictEntry[]
): Record<string, DayEntry> {
  const result = { ...merged };

  for (const conflict of conflicts) {
    const choice = resolutions.get(conflict.date);
    if (choice === "local") {
      result[conflict.date] = conflict.local;
    } else if (choice === "remote") {
      result[conflict.date] = conflict.remote;
    }
    // If no choice made, skip (shouldn't happen)
  }

  return result;
}

export function mergeAdjustments(local: Adjustment[], remote: Adjustment[]): Adjustment[] {
  // Union by ID - adjustments have unique IDs so no conflicts possible
  const byId = new Map<string, Adjustment>();

  for (const adj of local) {
    byId.set(adj.id, adj);
  }

  for (const adj of remote) {
    if (!byId.has(adj.id)) {
      byId.set(adj.id, adj);
    }
  }

  // Sort by date
  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

export function prepareSyncResult(
  localPayload: SyncPayload,
  remotePayload: SyncPayload
): SyncResult {
  const conflicts = detectConflicts(localPayload.entries, remotePayload.entries);
  const mergedEntries = mergeNonConflicting(localPayload.entries, remotePayload.entries, conflicts);
  const mergedAdjustments = mergeAdjustments(localPayload.adjustments, remotePayload.adjustments);

  return {
    mergedEntries,
    mergedAdjustments,
    conflicts,
  };
}
