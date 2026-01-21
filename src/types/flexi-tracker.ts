export type DayType =
  | "normal"
  | "sick"
  | "sick-half"
  | "holiday"
  | "holiday-half"
  | "flexi"
  | "flexi-half";

export type NonWorkingDayDisplay = "show" | "disable" | "hide";

export interface DayTypeInfo {
  label: string;
  icon: string | null;
  color: string;
}

export interface Settings {
  workingDays: number[];
  expectedMinutesPerDay: number;
  weekStartsOn: number;
  nonWorkingDayDisplay: NonWorkingDayDisplay;
  nonWorkingDayRate: number;
}

export interface DayEntry {
  startTime?: string | null;
  endTime?: string | null;
  breakMinutes?: number;
  dayType?: DayType;
}

export interface Adjustment {
  id: string;
  date: string;
  minutes: number;
  note: string;
}

export interface AppState {
  settings: Settings;
  entries: Record<string, DayEntry>;
  adjustments: Adjustment[];
}

export interface MenuItem {
  type: string;
  label: string;
  icon?: string;
  action: () => void;
}

// P2P Sync Types
export interface SyncPayload {
  entries: Record<string, DayEntry>;
  adjustments: Adjustment[];
  settings: Settings;
  timestamp: number;
}

export interface ConflictEntry {
  date: string;
  local: DayEntry;
  remote: DayEntry;
}

export interface SyncResult {
  mergedEntries: Record<string, DayEntry>;
  mergedAdjustments: Adjustment[];
  conflicts: ConflictEntry[];
}

declare global {
  interface Window {
    storage: {
      get: (key: string) => Promise<{ value?: string } | null>;
      set: (key: string, value: string) => Promise<void>;
    };
  }
}
