import { useRef, type ChangeEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Upload } from "lucide-react";
import type { Settings, AppState, NonWorkingDayDisplay } from "@/types/flexi-tracker";
import { FULL_DAYS, formatDuration } from "@/lib/flexi-tracker-utils";
import { cn } from "@/lib/utils";

interface SettingsPanelProps {
  open: boolean;
  settings: Settings;
  appState: AppState;
  onChange: (settings: Settings) => void;
  onImport: (data: AppState) => void;
  onClose: () => void;
}

export function SettingsPanel({
  open,
  settings,
  appState,
  onChange,
  onImport,
  onClose,
}: SettingsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const data = JSON.stringify(appState, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flexi-hours-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data && typeof data === "object") {
          onImport(data);
          alert("Data imported successfully!");
        } else {
          alert("Invalid file format");
        }
      } catch (err) {
        alert("Failed to parse file: " + (err as Error).message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Working Days */}
          <div>
            <label className="block text-sm font-medium mb-3">Working Days</label>
            <div className="flex flex-wrap gap-2">
              {FULL_DAYS.map((day, i) => (
                <Button
                  key={day}
                  variant={settings.workingDays.includes(i) ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    const days = settings.workingDays.includes(i)
                      ? settings.workingDays.filter((d) => d !== i)
                      : [...settings.workingDays, i].sort();
                    onChange({ ...settings, workingDays: days });
                  }}
                >
                  {day.slice(0, 3)}
                </Button>
              ))}
            </div>
          </div>

          {/* Expected Hours */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Expected Hours Per Day
            </label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                value={settings.expectedMinutesPerDay / 60}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    expectedMinutesPerDay:
                      Math.max(0, parseFloat(e.target.value) || 0) * 60,
                  })
                }
                step="0.5"
                min="0"
                max="24"
                className="w-24 text-center"
              />
              <span className="text-muted-foreground">hours</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Weekly target:{" "}
              {formatDuration(
                settings.expectedMinutesPerDay * settings.workingDays.length
              )}
            </p>
          </div>

          {/* Week Starts On */}
          <div>
            <label className="block text-sm font-medium mb-2">Week Starts On</label>
            <div className="flex gap-2">
              {[
                { v: 1, l: "Monday" },
                { v: 0, l: "Sunday" },
              ].map(({ v, l }) => (
                <Button
                  key={v}
                  variant={settings.weekStartsOn === v ? "default" : "outline"}
                  size="sm"
                  onClick={() => onChange({ ...settings, weekStartsOn: v })}
                >
                  {l}
                </Button>
              ))}
            </div>
          </div>

          {/* Non-Working Days Settings */}
          <div className="pt-4 border-t">
            <label className="block text-sm font-medium mb-3">Non-Working Days</label>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-2">
                  Display
                </label>
                <div className="flex gap-2">
                  {(["show", "disable", "hide"] as NonWorkingDayDisplay[]).map((v) => (
                    <Button
                      key={v}
                      variant={settings.nonWorkingDayDisplay === v ? "default" : "outline"}
                      size="sm"
                      onClick={() => onChange({ ...settings, nonWorkingDayDisplay: v })}
                      className="capitalize"
                    >
                      {v}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-2">
                  Overtime Rate
                </label>
                <div className="flex gap-2">
                  {[
                    { v: 1, l: "1x" },
                    { v: 1.5, l: "1.5x" },
                    { v: 2, l: "2x" },
                  ].map(({ v, l }) => (
                    <Button
                      key={v}
                      variant={settings.nonWorkingDayRate === v ? "default" : "outline"}
                      size="sm"
                      onClick={() => onChange({ ...settings, nonWorkingDayRate: v })}
                      className={cn(
                        settings.nonWorkingDayRate === v && "bg-amber-500 hover:bg-amber-600"
                      )}
                    >
                      {l}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Hours worked on non-working days are multiplied by this rate
                </p>
              </div>
            </div>
          </div>

          {/* Data Management */}
          <div className="pt-4 border-t">
            <label className="block text-sm font-medium mb-3">Data Management</label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleExport}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Export your data as a backup file, or import a previous backup.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
