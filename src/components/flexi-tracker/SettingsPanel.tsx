import { useRef, useState, type ChangeEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Upload, AlertTriangle, Trash2, FileUp, ClipboardPaste } from "lucide-react";
import type { Settings, AppState, NonWorkingDayDisplay } from "@/types/flexi-tracker";
import { FULL_DAYS, formatDuration } from "@/lib/flexi-tracker-utils";
import { cn } from "@/lib/utils";

interface SettingsPanelProps {
  open: boolean;
  settings: Settings;
  appState: AppState;
  onChange: (settings: Settings) => void;
  onImport: (data: AppState) => void;
  onClear: () => void;
  onClose: () => void;
}

export function SettingsPanel({
  open,
  settings,
  appState,
  onChange,
  onImport,
  onClear,
  onClose,
}: SettingsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [clearStep, setClearStep] = useState(0);
  const [confirmText, setConfirmText] = useState("");
  const [importMode, setImportMode] = useState<"select" | "paste" | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  const handleClearClick = () => {
    setClearStep(1);
  };

  const handleClearConfirm = () => {
    if (clearStep === 1) {
      setClearStep(2);
    } else if (clearStep === 2) {
      setClearStep(3);
    } else if (clearStep === 3 && confirmText === "DELETE") {
      onClear();
      setClearStep(0);
      setConfirmText("");
      onClose();
    }
  };

  const handleClearCancel = () => {
    setClearStep(0);
    setConfirmText("");
  };

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

  const handleFileImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data && typeof data === "object") {
          onImport(data);
          setImportMode(null);
          setImportError(null);
          alert("Data imported successfully!");
        } else {
          setImportError("Invalid file format");
        }
      } catch (err) {
        setImportError("Failed to parse file: " + (err as Error).message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handlePasteImport = () => {
    try {
      const data = JSON.parse(pasteText);
      if (data && typeof data === "object") {
        onImport(data);
        setImportMode(null);
        setPasteText("");
        setImportError(null);
        alert("Data imported successfully!");
      } else {
        setImportError("Invalid JSON format");
      }
    } catch (err) {
      setImportError("Failed to parse JSON: " + (err as Error).message);
    }
  };

  const handleImportCancel = () => {
    setImportMode(null);
    setPasteText("");
    setImportError(null);
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
            <label className="block text-sm font-medium mb-2">Expected Hours Per Day</label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                value={settings.expectedMinutesPerDay / 60}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    expectedMinutesPerDay: Math.max(0, parseFloat(e.target.value) || 0) * 60,
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
              {formatDuration(settings.expectedMinutesPerDay * settings.workingDays.length)}
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
                <label className="block text-xs text-muted-foreground mb-2">Display</label>
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
                <label className="block text-xs text-muted-foreground mb-2">Overtime Rate</label>
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

            {importMode === null && (
              <>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={handleExport}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setImportMode("select")}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Export your data as a backup file, or import a previous backup.
                </p>
              </>
            )}

            {importMode === "select" && (
              <div className="space-y-3 p-4 bg-muted/50 border rounded-md">
                <p className="text-sm font-medium">Choose import method</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FileUp className="h-4 w-4 mr-2" />
                    Upload File
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setImportMode("paste")}
                  >
                    <ClipboardPaste className="h-4 w-4 mr-2" />
                    Paste Text
                  </Button>
                </div>
                <Button variant="ghost" size="sm" className="w-full" onClick={handleImportCancel}>
                  Cancel
                </Button>
                {importError && <p className="text-xs text-destructive">{importError}</p>}
              </div>
            )}

            {importMode === "paste" && (
              <div className="space-y-3 p-4 bg-muted/50 border rounded-md">
                <p className="text-sm font-medium">Paste JSON data</p>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder='{"settings": {...}, "entries": {...}, "adjustments": [...]}'
                  className="w-full h-32 px-3 py-2 text-sm font-mono bg-background border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {importError && <p className="text-xs text-destructive">{importError}</p>}
                <div className="flex gap-2">
                  <Button variant="ghost" className="flex-1" onClick={handleImportCancel}>
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handlePasteImport}
                    disabled={!pasteText.trim()}
                  >
                    Import
                  </Button>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
          </div>

          {/* Danger Zone */}
          <div className="pt-4 border-t border-destructive/30">
            <label className="block text-sm font-medium mb-3 text-destructive">Danger Zone</label>

            {clearStep === 0 && (
              <Button variant="destructive" className="w-full" onClick={handleClearClick}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All Data
              </Button>
            )}

            {clearStep === 1 && (
              <div className="space-y-3 p-4 bg-destructive/10 border border-destructive/30 rounded-md">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive">Are you sure?</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      This will permanently delete ALL your tracked hours, adjustments, and
                      settings.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={handleClearCancel}>
                    Cancel
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={handleClearConfirm}>
                    Yes, Continue
                  </Button>
                </div>
              </div>
            )}

            {clearStep === 2 && (
              <div className="space-y-3 p-4 bg-destructive/10 border border-destructive/30 rounded-md">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive">This action is NOT reversible!</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Have you backed up your data? Use the Export button above to save a backup
                      before proceeding.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={handleClearCancel}>
                    Cancel
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={handleClearConfirm}>
                    I Have a Backup
                  </Button>
                </div>
              </div>
            )}

            {clearStep === 3 && (
              <div className="space-y-3 p-4 bg-destructive/10 border border-destructive/30 rounded-md">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive">Final Confirmation</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Type <span className="font-mono font-bold text-destructive">DELETE</span> to
                      confirm you want to erase everything.
                    </p>
                  </div>
                </div>
                <Input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                  className="font-mono text-center border-destructive/50 focus:border-destructive"
                />
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={handleClearCancel}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handleClearConfirm}
                    disabled={confirmText !== "DELETE"}
                  >
                    Delete Everything
                  </Button>
                </div>
              </div>
            )}

            {clearStep === 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Permanently delete all your tracked time entries and adjustments.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
