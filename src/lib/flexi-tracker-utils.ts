import type { DayEntry, DayType, DayTypeInfo, Settings } from "@/types/flexi-tracker";

export const DEFAULT_SETTINGS: Settings = {
  workingDays: [1, 2, 3, 4, 5],
  expectedMinutesPerDay: 450,
  weekStartsOn: 1,
  nonWorkingDayDisplay: "show",
  nonWorkingDayRate: 1,
};

export const DEFAULT_STATE = {
  settings: DEFAULT_SETTINGS,
  entries: {} as Record<string, DayEntry>,
  adjustments: [],
};

export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const FULL_DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const DAY_TYPES: Record<DayType, DayTypeInfo> = {
  normal: { label: "", icon: null, color: "" },
  sick: { label: "Sick", icon: "Thermometer", color: "bg-amber-100 dark:bg-amber-950 border-amber-300 dark:border-amber-700" },
  "sick-half": {
    label: "1/2 Sick",
    icon: "Thermometer",
    color: "bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800",
  },
  holiday: { label: "Holiday", icon: "Palmtree", color: "bg-sky-100 dark:bg-sky-950 border-sky-300 dark:border-sky-700" },
  "holiday-half": {
    label: "1/2 Holiday",
    icon: "Palmtree",
    color: "bg-sky-50 dark:bg-sky-950/50 border-sky-200 dark:border-sky-800",
  },
  flexi: {
    label: "Flexi",
    icon: "Clock",
    color: "bg-violet-100 dark:bg-violet-950 border-violet-300 dark:border-violet-700",
  },
  "flexi-half": {
    label: "1/2 Flexi",
    icon: "Clock",
    color: "bg-violet-50 dark:bg-violet-950/50 border-violet-200 dark:border-violet-800",
  },
};

export const formatMinutes = (mins: number): string => {
  const sign = mins < 0 ? "-" : "+";
  const abs = Math.abs(mins);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${sign}${m}m`;
  if (m === 0) return `${sign}${h}h`;
  return `${sign}${h}h ${m}m`;
};

export const formatMinutesDecimal = (mins: number): string => {
  const sign = mins < 0 ? "-" : "+";
  const abs = Math.abs(mins);
  const decimal = (abs / 60).toFixed(2);
  return `${sign}${decimal}`;
};

export const formatDuration = (mins: number): string => {
  if (mins === 0) return "0h 0m";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

export const formatDurationDecimal = (mins: number): string => {
  return (mins / 60).toFixed(2);
};

export const parseTime = (str: string): string | null => {
  if (!str) return null;
  const clean = str.replace(/[^0-9]/g, "");
  if (clean.length === 0) return null;
  if (clean.length <= 2) {
    const h = parseInt(clean, 10);
    if (h >= 0 && h <= 23) return `${h.toString().padStart(2, "0")}:00`;
  }
  if (clean.length === 3) {
    const h = parseInt(clean[0], 10);
    const m = parseInt(clean.slice(1), 10);
    if (h >= 0 && h <= 9 && m >= 0 && m <= 59)
      return `0${h}:${m.toString().padStart(2, "0")}`;
  }
  if (clean.length >= 4) {
    const h = parseInt(clean.slice(0, 2), 10);
    const m = parseInt(clean.slice(2, 4), 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59)
      return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  }
  return str;
};

export const timeToMinutes = (time: string | null | undefined): number => {
  if (!time) return 0;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

export const getDateStr = (date: Date): string => date.toISOString().split("T")[0];

export const getWeekDates = (date: Date, weekStartsOn: number): Date[] => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day - weekStartsOn + 7) % 7;
  d.setDate(d.getDate() - diff);
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    dates.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return dates;
};

export const calculateWorked = (entry: DayEntry | undefined): number => {
  if (!entry?.startTime || !entry?.endTime) return 0;
  const start = timeToMinutes(entry.startTime);
  const end = timeToMinutes(entry.endTime);
  const worked = end - start - (entry.breakMinutes || 0);
  return Math.max(0, worked);
};

export const calculateEffectiveWorked = (
  entry: DayEntry | undefined,
  expectedMinutes: number,
  isWorkingDay = true,
  nonWorkingDayRate = 1
): number => {
  const actualWorked = calculateWorked(entry);
  const dayType = entry?.dayType || "normal";

  const rateMultiplier = isWorkingDay ? 1 : nonWorkingDayRate;

  switch (dayType) {
    case "sick":
    case "holiday":
      return expectedMinutes;
    case "sick-half":
    case "holiday-half":
      return Math.floor(expectedMinutes / 2) + actualWorked;
    case "flexi":
      return 0;
    case "flexi-half":
      return actualWorked;
    default:
      return Math.floor(actualWorked * rateMultiplier);
  }
};

export const getEffectiveExpected = (
  _entry: DayEntry | undefined,
  expectedMinutes: number,
  isWorkingDay: boolean
): number => {
  if (!isWorkingDay) return 0;
  return expectedMinutes;
};

export const getCurrentTimeStr = (): string => {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
};
