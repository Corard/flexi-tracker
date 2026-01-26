import { useState, useEffect, useMemo, useCallback, useImperativeHandle, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/kbd";
import { Thermometer, Palmtree, Clock, Check, X, ClipboardCopy } from "lucide-react";
import type { DayEntry, DayType, MenuItem } from "@/types/flexi-tracker";
import {
  DAYS,
  DAY_TYPES,
  calculateWorked,
  calculateEffectiveWorked,
  timeToMinutes,
  formatDuration,
  formatDurationDecimal,
  formatMinutes,
  formatMinutesDecimal,
  getCurrentTimeStr,
} from "@/lib/flexi-tracker-utils";
import { TimeInput } from "./TimeInput";
import { BreakInput } from "./BreakInput";
import { cn } from "@/lib/utils";

interface DayCardProps {
  date: Date;
  entry: DayEntry;
  expected: number;
  isWorkingDay: boolean;
  isToday: boolean;
  isDisabled: boolean;
  isSelected: boolean;
  rate: number;
  yesterdayEntry?: DayEntry;
  shiftHeld: boolean;
  onChange: (entry: DayEntry) => void;
}

export interface DayCardRef {
  openPresets: () => void;
  closePresets: () => void;
  isPresetsOpen: () => boolean;
}

const DayTypeIcon = ({ type }: { type: string }) => {
  switch (type) {
    case "Thermometer":
      return <Thermometer className="h-3 w-3" />;
    case "Palmtree":
      return <Palmtree className="h-3 w-3" />;
    case "Clock":
      return <Clock className="h-3 w-3" />;
    default:
      return null;
  }
};

export const DayCard = forwardRef<DayCardRef, DayCardProps>(function DayCard(
  {
    date,
    entry,
    expected,
    isWorkingDay,
    isToday,
    isDisabled,
    isSelected,
    rate,
    yesterdayEntry,
    shiftHeld,
    onChange,
  },
  ref
) {
  const [showPresets, setShowPresets] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [now, setNow] = useState(new Date());
  const dayType: DayType = entry?.dayType || "normal";
  const typeInfo = DAY_TYPES[dayType];

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    openPresets: () => {
      if (!isDisabled) {
        setSelectedIndex(0);
        setShowPresets(true);
      }
    },
    closePresets: () => setShowPresets(false),
    isPresetsOpen: () => showPresets,
  }));

  const fmtDuration = shiftHeld ? formatDurationDecimal : formatDuration;
  const fmtMinutes = shiftHeld ? formatMinutesDecimal : formatMinutes;

  const isLiveTracking = isToday && entry?.startTime && !entry?.endTime && !isDisabled;

  useEffect(() => {
    if (!isLiveTracking) return;
    const interval = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(interval);
  }, [isLiveTracking]);

  const actualWorked = calculateWorked(entry);

  const liveElapsed = useMemo(() => {
    if (!isLiveTracking || !entry.startTime) return 0;
    const startMins = timeToMinutes(entry.startTime);
    const nowMins = now.getHours() * 60 + now.getMinutes();
    return Math.max(0, nowMins - startMins - (entry.breakMinutes || 0));
  }, [isLiveTracking, entry?.startTime, entry?.breakMinutes, now]);

  const displayWorked = isLiveTracking ? liveElapsed : actualWorked;
  const effectiveWorked = isLiveTracking
    ? Math.floor(liveElapsed * (isWorkingDay ? 1 : rate))
    : calculateEffectiveWorked(entry, expected, isWorkingDay, rate);
  const balance = isWorkingDay ? effectiveWorked - expected : effectiveWorked;
  const hasData = entry?.startTime || entry?.endTime || dayType !== "normal";
  const dayNum = date.getDay();

  const canCopyFromYesterday = yesterdayEntry?.startTime && yesterdayEntry?.endTime;

  const setDayType = useCallback(
    (type: DayType) => {
      if (isDisabled) return;
      onChange({ ...entry, dayType: type === "normal" ? undefined : type });
      setShowPresets(false);
    },
    [isDisabled, onChange, entry]
  );

  const clearDay = useCallback(() => {
    if (isDisabled) return;
    onChange(null as unknown as DayEntry); // Signal to delete the entry
    setShowPresets(false);
  }, [isDisabled, onChange]);

  const copyFromYesterday = useCallback(() => {
    if (isDisabled || !canCopyFromYesterday) return;
    onChange({
      startTime: yesterdayEntry!.startTime,
      endTime: yesterdayEntry!.endTime,
      breakMinutes: yesterdayEntry!.breakMinutes || 0,
    });
    setShowPresets(false);
  }, [isDisabled, canCopyFromYesterday, onChange, yesterdayEntry]);

  const menuItems = useMemo((): MenuItem[] => {
    const items: MenuItem[] = [];
    if (canCopyFromYesterday) {
      items.push({
        type: "copy",
        label: "Copy yesterday",
        icon: "copy",
        shortcut: "Y",
        action: copyFromYesterday,
      });
    }
    items.push(
      {
        type: "normal",
        label: "Normal",
        icon: "check",
        shortcut: "N",
        action: () => setDayType("normal"),
      },
      {
        type: "sick",
        label: "Sick Day",
        icon: "sick",
        shortcut: "S",
        action: () => setDayType("sick"),
      },
      {
        type: "sick-half",
        label: "1/2 Sick",
        icon: "sick",
        shortcut: "S",
        shiftShortcut: true,
        action: () => setDayType("sick-half"),
      },
      {
        type: "holiday",
        label: "Holiday",
        icon: "holiday",
        shortcut: "H",
        action: () => setDayType("holiday"),
      },
      {
        type: "holiday-half",
        label: "1/2 Holiday",
        icon: "holiday",
        shortcut: "H",
        shiftShortcut: true,
        action: () => setDayType("holiday-half"),
      },
      {
        type: "flexi",
        label: "Flexi Day",
        icon: "flexi",
        shortcut: "F",
        action: () => setDayType("flexi"),
      },
      {
        type: "flexi-half",
        label: "1/2 Flexi",
        icon: "flexi",
        shortcut: "F",
        shiftShortcut: true,
        action: () => setDayType("flexi-half"),
      }
    );
    if (hasData) {
      items.push({
        type: "clear",
        label: "Clear Day",
        icon: "clear",
        shortcut: "X",
        action: clearDay,
      });
    }
    return items;
  }, [canCopyFromYesterday, hasData, copyFromYesterday, setDayType, clearDay]);

  const togglePresets = useCallback(() => {
    if (!showPresets) {
      setSelectedIndex(0); // Reset when opening
    }
    setShowPresets(!showPresets);
  }, [showPresets]);

  useEffect(() => {
    if (!showPresets) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle arrow navigation and standard keys
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => (i + 1) % menuItems.length);
          return;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => (i - 1 + menuItems.length) % menuItems.length);
          return;
        case "Enter":
        case " ":
          e.preventDefault();
          menuItems[selectedIndex]?.action();
          return;
        case "Escape":
          e.preventDefault();
          setShowPresets(false);
          return;
      }

      // Handle mnemonic shortcuts
      const key = e.key.toUpperCase();
      const matchingItem = menuItems.find(
        (item) => item.shortcut === key && (item.shiftShortcut ? e.shiftKey : !e.shiftKey)
      );

      if (matchingItem) {
        e.preventDefault();
        matchingItem.action();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showPresets, selectedIndex, menuItems]);

  const getMenuIcon = (iconType: string | undefined) => {
    switch (iconType) {
      case "copy":
        return <ClipboardCopy className="h-3 w-3" />;
      case "check":
        return <Check className="h-3 w-3" />;
      case "sick":
        return <Thermometer className="h-3 w-3" />;
      case "holiday":
        return <Palmtree className="h-3 w-3" />;
      case "flexi":
        return <Clock className="h-3 w-3" />;
      case "clear":
        return <X className="h-3 w-3" />;
      default:
        return null;
    }
  };

  return (
    <Card
      className={cn(
        "p-4 transition-all duration-200 relative overflow-visible border",
        isToday && "ring-2 ring-primary/50 shadow-lg",
        isSelected && !isToday && "ring-2 ring-primary/30",
        isDisabled && "opacity-50 pointer-events-none",
        dayType !== "normal" && typeInfo.color,
        dayType === "normal" && isWorkingDay && "bg-card border-border hover:shadow-md",
        dayType === "normal" && !isWorkingDay && "bg-muted/50 border-transparent"
      )}
    >
      {/* Rate badge for non-working days */}
      {!isWorkingDay && rate > 1 && hasData && (
        <Badge variant="secondary" className="absolute -top-2 -right-2 bg-amber-400 text-amber-900">
          {rate}x
        </Badge>
      )}

      {/* Live tracking indicator */}
      {isLiveTracking && (
        <div className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-3 h-3">
          <span className="absolute h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
          <span className="absolute rounded-full h-3 w-3 bg-emerald-500" />
        </div>
      )}

      {/* Day Type Badge */}
      {dayType !== "normal" && (
        <Badge
          variant="outline"
          className="absolute -top-2 left-1/2 -translate-x-1/2 bg-background flex items-center gap-1"
        >
          {typeInfo.icon && <DayTypeIcon type={typeInfo.icon} />}
          <span>{typeInfo.label}</span>
        </Badge>
      )}

      <div className="text-center mb-3">
        <div
          className={cn(
            "text-xs font-semibold uppercase tracking-wider",
            isWorkingDay ? "text-muted-foreground" : "text-muted-foreground/60"
          )}
        >
          {DAYS[dayNum]}
        </div>
        <div
          className={cn(
            "text-2xl font-light",
            isWorkingDay ? "text-foreground" : "text-muted-foreground/60"
          )}
        >
          {date.getDate()}
        </div>
      </div>

      {/* Preset Button & Dropdown Container */}
      <div className="relative">
        <Button
          variant={dayType !== "normal" ? "secondary" : "outline"}
          size="sm"
          onClick={togglePresets}
          className="w-full mb-2 text-xs h-7"
        >
          {dayType !== "normal" ? (
            <span className="flex items-center gap-1">
              {typeInfo.icon && <DayTypeIcon type={typeInfo.icon} />}
              {typeInfo.label}
            </span>
          ) : (
            "+ Preset"
          )}
        </Button>

        {/* Preset Dropdown */}
        {showPresets && (
          <Card className="absolute left-0 right-0 mt-0 z-50 shadow-lg gap-0 py-1">
            {menuItems.map((item, index) => {
              const isItemSelected = selectedIndex === index;

              return (
                <button
                  key={item.type}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    "w-full px-2 py-1.5 text-left text-xs transition-colors",
                    item.type === "copy" ? "flex flex-col gap-0.5" : "flex items-center gap-1.5",
                    item.type === "copy" && "text-blue-600",
                    item.type === "clear" && "text-destructive",
                    isItemSelected && "bg-muted",
                    !isItemSelected && "hover:bg-muted/50",
                    dayType === item.type && "font-medium"
                  )}
                >
                  {item.type === "copy" && yesterdayEntry ? (
                    <>
                      <span className="flex items-center justify-between w-full">
                        <span className="flex items-center gap-1.5">
                          <span className="w-4 shrink-0">{getMenuIcon(item.icon)}</span>
                          <span>{item.label}</span>
                        </span>
                        {item.shortcut && <Kbd>{item.shortcut}</Kbd>}
                      </span>
                      <span className="text-[10px] text-blue-400 pl-5">
                        {yesterdayEntry.startTime} - {yesterdayEntry.endTime}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="w-4 shrink-0">{getMenuIcon(item.icon)}</span>
                      <span className="truncate flex-1">{item.label}</span>
                      {item.shortcut && (
                        <span className="flex items-center gap-0.5 ml-auto">
                          {item.shiftShortcut && <Kbd>Shift</Kbd>}
                          <Kbd>{item.shortcut}</Kbd>
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </Card>
        )}
      </div>

      {/* Time Inputs - dimmed if full day preset */}
      <div
        className={cn("space-y-2", ["sick", "holiday", "flexi"].includes(dayType) && "opacity-40")}
      >
        <div className="space-y-1">
          <TimeInput
            value={entry?.startTime}
            onChange={(v) => onChange({ ...entry, startTime: v })}
            placeholder="start"
          />
          <TimeInput
            value={entry?.endTime}
            onChange={(v) => onChange({ ...entry, endTime: v })}
            placeholder="end"
          />
        </div>

        <BreakInput
          value={entry?.breakMinutes || 0}
          onChange={(v) => onChange({ ...entry, breakMinutes: v })}
        />
      </div>

      <div className="mt-4 pt-3 border-t border-border/50">
        <div
          className={cn(
            "text-center text-lg font-semibold",
            isLiveTracking && "text-emerald-600",
            !isLiveTracking && hasData && "text-foreground",
            !isLiveTracking && !hasData && "text-muted-foreground/50"
          )}
        >
          {isLiveTracking ? (
            <div className="flex flex-col items-center gap-1">
              <span className="flex items-center justify-center gap-1">
                {fmtDuration(displayWorked)}
                <span className="text-xs text-emerald-500 font-normal">live</span>
              </span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onChange({ ...entry, endTime: getCurrentTimeStr() })}
                className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
              >
                Clock out
              </Button>
            </div>
          ) : isToday && !entry?.startTime && !isDisabled ? (
            <div className="flex flex-col items-center gap-1">
              <span>-</span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onChange({ ...entry, startTime: getCurrentTimeStr() })}
                className="bg-blue-100 text-blue-700 hover:bg-blue-200"
              >
                Clock in
              </Button>
            </div>
          ) : hasData ? (
            dayType !== "normal" && actualWorked === 0 ? (
              typeInfo.label
            ) : (
              fmtDuration(effectiveWorked)
            )
          ) : (
            "-"
          )}
        </div>
        {isWorkingDay && (
          <div
            className={cn(
              "text-center text-sm font-medium",
              balance > 0 && "text-emerald-600",
              balance < 0 && "text-destructive",
              balance === 0 && "text-muted-foreground"
            )}
          >
            {hasData || isLiveTracking || balance !== -expected ? fmtMinutes(balance) : "-"}
          </div>
        )}
      </div>

      {/* Click outside to close presets */}
      {showPresets && <div className="fixed inset-0 z-10" onClick={() => setShowPresets(false)} />}
    </Card>
  );
});
