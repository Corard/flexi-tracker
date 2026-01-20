import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Clock, ChevronRight } from "lucide-react";
import { useStorage } from "@/hooks/use-storage";
import { useShiftKey } from "@/hooks/use-shift-key";
import {
  DEFAULT_SETTINGS,
  getWeekDates,
  getDateStr,
  calculateEffectiveWorked,
  formatDuration,
  formatDurationDecimal,
  formatMinutes,
  formatMinutesDecimal,
} from "@/lib/flexi-tracker-utils";
import { cn } from "@/lib/utils";
import type { DayEntry, AppState } from "@/types/flexi-tracker";

import { DayCard } from "./DayCard";
import { WeekNav } from "./WeekNav";
import { SettingsPanel } from "./SettingsPanel";
import { AdjustmentsPanel } from "./AdjustmentsPanel";
import { ModeToggle } from "@/components/mode-toggle";

export function FlexiTracker() {
  const [state, save, loaded] = useStorage();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const [showAdjustments, setShowAdjustments] = useState(false);
  const shiftHeld = useShiftKey();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      if (showSettings || showAdjustments) return;

      if (e.key === "ArrowLeft") {
        setCurrentDate((d) => {
          const newDate = new Date(d);
          newDate.setDate(newDate.getDate() - 7);
          return newDate;
        });
      } else if (e.key === "ArrowRight") {
        setCurrentDate((d) => {
          const newDate = new Date(d);
          newDate.setDate(newDate.getDate() + 7);
          return newDate;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showSettings, showAdjustments]);

  const fmtDuration = shiftHeld ? formatDurationDecimal : formatDuration;
  const fmtMinutes = shiftHeld ? formatMinutesDecimal : formatMinutes;

  const { settings, entries, adjustments } = state;

  const weekDates = useMemo(
    () => getWeekDates(currentDate, settings.weekStartsOn),
    [currentDate, settings.weekStartsOn]
  );

  const weekStats = useMemo(() => {
    let worked = 0;
    let expected = 0;

    weekDates.forEach((date) => {
      const key = getDateStr(date);
      const entry = entries[key];
      const isWorkingDay = settings.workingDays.includes(date.getDay());
      const hasEntry = entry && (entry.startTime || entry.endTime || entry.dayType);

      worked += calculateEffectiveWorked(
        entry,
        settings.expectedMinutesPerDay,
        isWorkingDay,
        settings.nonWorkingDayRate
      );
      // Only count expected hours for days that have entries
      if (isWorkingDay && hasEntry) expected += settings.expectedMinutesPerDay;
    });

    return { worked, expected, balance: worked - expected };
  }, [weekDates, entries, settings]);

  const overallBalance = useMemo(() => {
    let total = 0;
    Object.entries(entries).forEach(([dateStr, entry]) => {
      // Skip empty entries (stale data from cleared days)
      if (!entry || (!entry.startTime && !entry.endTime && !entry.dayType)) {
        return;
      }
      // Parse date in local timezone to avoid UTC offset issues
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      const isWorkingDay = settings.workingDays.includes(date.getDay());
      const effectiveWorked = calculateEffectiveWorked(
        entry,
        settings.expectedMinutesPerDay,
        isWorkingDay,
        settings.nonWorkingDayRate
      );
      if (isWorkingDay) {
        total += effectiveWorked - settings.expectedMinutesPerDay;
      } else {
        total += effectiveWorked;
      }
    });

    total += adjustments.reduce((sum, a) => sum + a.minutes, 0);

    return total;
  }, [entries, settings, adjustments]);

  const updateEntry = (dateStr: string, entry: DayEntry | null) => {
    if (entry === null) {
      // Delete the entry entirely
      const newEntries = { ...entries };
      delete newEntries[dateStr];
      save({ ...state, entries: newEntries });
    } else {
      save({
        ...state,
        entries: { ...entries, [dateStr]: entry },
      });
    }
  };

  const updateSettings = (newSettings: typeof settings) => {
    save({ ...state, settings: newSettings });
  };

  const addAdjustment = (adj: (typeof adjustments)[0]) => {
    save({ ...state, adjustments: [...adjustments, adj] });
  };

  const deleteAdjustment = (id: string) => {
    save({ ...state, adjustments: adjustments.filter((a) => a.id !== id) });
  };

  const importData = (data: Partial<AppState>) => {
    const merged: AppState = {
      settings: { ...DEFAULT_SETTINGS, ...data.settings },
      entries: data.entries || {},
      adjustments: data.adjustments || [],
    };
    save(merged);
  };

  if (!loaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Flexi Hours</h1>
            <p className="text-muted-foreground text-sm">
              Track your flexible working time
            </p>
          </div>
          <div className="flex items-center gap-1">
            <ModeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(true)}
            >
              <Settings className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Week Navigation */}
        <WeekNav currentDate={currentDate} onChange={setCurrentDate} />

        {/* Day Cards */}
        <div
          className={cn(
            "grid gap-4 mb-6",
            settings.nonWorkingDayDisplay === "hide"
              ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
              : "grid-cols-2 sm:grid-cols-4 lg:grid-cols-7"
          )}
        >
          {weekDates
            .filter((date) => {
              if (settings.nonWorkingDayDisplay !== "hide") return true;
              return settings.workingDays.includes(date.getDay());
            })
            .map((date) => {
              const key = getDateStr(date);
              const isWorkingDay = settings.workingDays.includes(date.getDay());
              const isToday = getDateStr(new Date()) === key;
              const isDisabled =
                !isWorkingDay && settings.nonWorkingDayDisplay === "disable";

              const yesterday = new Date(date);
              yesterday.setDate(yesterday.getDate() - 1);
              const yesterdayKey = getDateStr(yesterday);
              const yesterdayEntry = entries[yesterdayKey];

              return (
                <DayCard
                  key={key}
                  date={date}
                  entry={entries[key] || {}}
                  expected={settings.expectedMinutesPerDay}
                  isWorkingDay={isWorkingDay}
                  isToday={isToday}
                  isDisabled={isDisabled}
                  rate={settings.nonWorkingDayRate}
                  yesterdayEntry={yesterdayEntry}
                  shiftHeld={shiftHeld}
                  onChange={(entry) => updateEntry(key, entry)}
                />
              );
            })}
        </div>

        {/* Week Summary */}
        <Card className="p-5 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">
                This Week
                {shiftHeld && (
                  <span className="ml-1 text-xs text-amber-500">(decimal)</span>
                )}
              </div>
              <div className="text-2xl font-semibold">
                {fmtDuration(weekStats.worked)}
                <span className="text-muted-foreground font-normal">
                  {" "}
                  / {fmtDuration(weekStats.expected)}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground mb-1">Week Balance</div>
              <div
                className={cn(
                  "text-2xl font-semibold",
                  weekStats.balance > 0 && "text-emerald-600",
                  weekStats.balance < 0 && "text-destructive",
                  weekStats.balance === 0 && "text-foreground"
                )}
              >
                {fmtMinutes(weekStats.balance)}
              </div>
            </div>
          </div>
        </Card>

        {/* Overall Flexi Balance */}
        <Card
          onClick={() => setShowAdjustments(true)}
          className="p-5 cursor-pointer hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                overallBalance >= 0
                  ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400"
              )}>
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="text-muted-foreground text-sm">
                  Overall Flexi Balance
                </div>
                <div
                  className={cn(
                    "text-2xl font-bold",
                    overallBalance >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  )}
                >
                  {fmtMinutes(overallBalance)}
                </div>
              </div>
            </div>
            <div className="text-muted-foreground text-sm flex items-center gap-1">
              Adjust
              <ChevronRight className="h-4 w-4" />
            </div>
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground mt-8">
          All data stored locally |{" "}
          <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">←</kbd>{" "}
          <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">→</kbd> to
          navigate weeks | Hold{" "}
          <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Shift</kbd> for
          decimal
        </div>
      </div>

      {/* Modals */}
      <SettingsPanel
        open={showSettings}
        settings={settings}
        appState={state}
        onChange={updateSettings}
        onImport={importData}
        onClose={() => setShowSettings(false)}
      />

      <AdjustmentsPanel
        open={showAdjustments}
        adjustments={adjustments}
        shiftHeld={shiftHeld}
        onAdd={addAdjustment}
        onDelete={deleteAdjustment}
        onClose={() => setShowAdjustments(false)}
      />
    </div>
  );
}
