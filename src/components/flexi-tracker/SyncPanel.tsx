import { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Html5Qrcode } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  QrCode,
  ScanLine,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Copy,
  Smartphone,
} from "lucide-react";
import type { AppState, ConflictEntry, DayEntry } from "@/types/flexi-tracker";
import { useP2PSync } from "@/hooks/use-p2p-sync";
import { cn } from "@/lib/utils";

interface SyncPanelProps {
  open: boolean;
  appState: AppState;
  initialMode?: "host" | "scan";
  onMerge: (state: AppState) => void;
  onClose: () => void;
}

function formatEntryDisplay(entry: DayEntry): string {
  const parts: string[] = [];
  if (entry.startTime && entry.endTime) {
    parts.push(`${entry.startTime} - ${entry.endTime}`);
  } else if (entry.startTime) {
    parts.push(`Start: ${entry.startTime}`);
  } else if (entry.endTime) {
    parts.push(`End: ${entry.endTime}`);
  }
  if (entry.breakMinutes) {
    parts.push(`${entry.breakMinutes}m break`);
  }
  if (entry.dayType && entry.dayType !== "normal") {
    parts.push(entry.dayType);
  }
  return parts.length > 0 ? parts.join(" | ") : "No data";
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function SyncPanel({ open, appState, initialMode, onMerge, onClose }: SyncPanelProps) {
  const sync = useP2PSync(appState, onMerge);
  const [manualCode, setManualCode] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [resolutions, setResolutions] = useState<Map<string, "local" | "remote">>(new Map());
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);
  const hasScanned = useRef(false);
  const connectToPeerRef = useRef(sync.connectToPeer);
  connectToPeerRef.current = sync.connectToPeer;

  // Start in the correct mode when opened
  useEffect(() => {
    if (open && sync.status === "idle" && initialMode && !hasStarted.current) {
      hasStarted.current = true;
      if (initialMode === "host") {
        sync.startHosting();
      } else {
        sync.startScanning();
      }
    }
    if (!open) {
      hasStarted.current = false;
    }
  }, [open, sync.status, initialMode, sync.startHosting, sync.startScanning]);

  // Cleanup scanner on unmount or status change
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, []);

  // Start camera when in scanning mode
  useEffect(() => {
    if (sync.status !== "scanning") {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
      hasScanned.current = false;
      return;
    }

    let cancelled = false;

    const startScanner = async () => {
      // Wait for DOM to render
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (cancelled) return;

      const element = document.getElementById("qr-scanner");
      if (!element) {
        setCameraError("Scanner element not found");
        return;
      }

      try {
        scannerRef.current = new Html5Qrcode("qr-scanner");
        await scannerRef.current.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            // Prevent multiple triggers
            if (hasScanned.current) return;
            hasScanned.current = true;

            // Stop scanner first and wait for it
            try {
              await scannerRef.current?.stop();
              scannerRef.current = null;
            } catch {
              // Ignore stop errors
            }

            // Then connect to peer
            connectToPeerRef.current(decodedText);
          },
          () => {
            // QR code not detected (ignore)
          }
        );
        setCameraError(null);
      } catch (err) {
        console.error("Camera error:", err);
        setCameraError(
          err instanceof Error ? err.message : "Failed to access camera. Please check permissions."
        );
      }
    };

    startScanner();

    return () => {
      cancelled = true;
    };
  }, [sync.status]);

  // Reset resolutions when conflicts change
  useEffect(() => {
    if (sync.syncResult?.conflicts) {
      setResolutions(new Map());
    }
  }, [sync.syncResult?.conflicts]);

  const handleClose = () => {
    sync.reset();
    setManualCode("");
    setCameraError(null);
    setResolutions(new Map());
    onClose();
  };

  const handleCopyCode = () => {
    if (sync.peerId) {
      navigator.clipboard.writeText(sync.peerId);
    }
  };

  const handleManualConnect = () => {
    if (manualCode.trim()) {
      sync.connectToPeer(manualCode.trim());
    }
  };

  const handleResolveConflict = (date: string, choice: "local" | "remote") => {
    setResolutions((prev) => new Map(prev).set(date, choice));
  };

  const handleApplyResolutions = () => {
    if (sync.syncResult?.conflicts.every((c) => resolutions.has(c.date))) {
      sync.resolveConflicts(resolutions);
    }
  };

  const allConflictsResolved =
    sync.syncResult?.conflicts.every((c) => resolutions.has(c.date)) ?? false;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sync with Another Device</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Idle State */}
          {sync.status === "idle" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Sync your flexi hours data between devices using a secure peer-to-peer connection.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => sync.startHosting()}
                >
                  <QrCode className="h-8 w-8" />
                  <span>Show QR Code</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => sync.startScanning()}
                >
                  <ScanLine className="h-8 w-8" />
                  <span>Scan QR Code</span>
                </Button>
              </div>
            </div>
          )}

          {/* Hosting State */}
          {sync.status === "hosting" && sync.peerId && (
            <div className="space-y-4">
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <QRCodeSVG value={sync.peerId} size={200} />
              </div>
              <p className="text-sm text-center text-muted-foreground">
                Scan this QR code with your other device
              </p>
              <div className="flex items-center gap-2">
                <Input value={sync.peerId} readOnly className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={handleCopyCode}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-center text-muted-foreground">Code expires in 2 minutes</p>
              <Button variant="ghost" className="w-full" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          )}

          {/* Scanning State */}
          {sync.status === "scanning" && (
            <div className="space-y-4">
              <div
                id="qr-scanner"
                ref={scannerContainerRef}
                className="w-full aspect-square rounded-lg overflow-hidden bg-muted"
              />
              {cameraError && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md">
                  <p className="text-sm text-destructive">{cameraError}</p>
                </div>
              )}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Or enter the code manually:</p>
                <div className="flex gap-2">
                  <Input
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Enter peer code"
                    className="font-mono"
                  />
                  <Button onClick={handleManualConnect} disabled={!manualCode.trim()}>
                    Connect
                  </Button>
                </div>
              </div>
              <Button variant="ghost" className="w-full" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          )}

          {/* Awaiting Acceptance State */}
          {sync.status === "awaiting-acceptance" && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
                  <Smartphone className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <div className="text-center">
                <p className="font-medium">Incoming Connection</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Another device wants to sync with you.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={sync.rejectConnection}>
                  Decline
                </Button>
                <Button className="flex-1" onClick={sync.acceptConnection}>
                  Accept
                </Button>
              </div>
            </div>
          )}

          {/* Connecting State */}
          {sync.status === "connecting" && (
            <div className="space-y-4 py-8">
              <div className="flex justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
              <p className="text-center text-muted-foreground">Connecting...</p>
            </div>
          )}

          {/* Syncing State */}
          {sync.status === "syncing" && (
            <div className="space-y-4 py-8">
              <div className="flex justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
              <p className="text-center text-muted-foreground">Syncing data...</p>
            </div>
          )}

          {/* Conflicts State */}
          {sync.status === "conflicts" && sync.syncResult && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-md">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-600 dark:text-amber-400">
                    {sync.syncResult.conflicts.length} conflict
                    {sync.syncResult.conflicts.length > 1 ? "s" : ""} found
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Choose which version to keep for each day:
                  </p>
                </div>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {sync.syncResult.conflicts.map((conflict) => (
                  <ConflictCard
                    key={conflict.date}
                    conflict={conflict}
                    selected={resolutions.get(conflict.date)}
                    onSelect={(choice) => handleResolveConflict(conflict.date, choice)}
                  />
                ))}
              </div>

              <Button
                className="w-full"
                onClick={handleApplyResolutions}
                disabled={!allConflictsResolved}
              >
                Apply Selections
              </Button>
            </div>
          )}

          {/* Complete State */}
          {sync.status === "complete" && (
            <div className="space-y-4 py-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <div className="text-center">
                <p className="font-medium text-emerald-600 dark:text-emerald-400">Sync Complete!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your data has been synchronized.
                </p>
              </div>
              {sync.syncResult && (
                <div className="text-center text-sm text-muted-foreground">
                  <p>
                    {Object.keys(sync.syncResult.mergedEntries).length} entries,{" "}
                    {sync.syncResult.mergedAdjustments.length} adjustments
                  </p>
                </div>
              )}
              <Button className="w-full" onClick={handleClose}>
                Done
              </Button>
            </div>
          )}

          {/* Error State */}
          {sync.status === "error" && (
            <div className="space-y-4 py-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
              </div>
              <div className="text-center">
                <p className="font-medium text-destructive">Sync Failed</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {sync.error || "An unknown error occurred"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={handleClose}>
                  Close
                </Button>
                <Button className="flex-1" onClick={() => sync.reset()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ConflictCardProps {
  conflict: ConflictEntry;
  selected?: "local" | "remote";
  onSelect: (choice: "local" | "remote") => void;
}

function ConflictCard({ conflict, selected, onSelect }: ConflictCardProps) {
  return (
    <Card className="p-3">
      <p className="font-medium text-sm mb-2">{formatDate(conflict.date)}</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onSelect("local")}
          className={cn(
            "p-2 rounded-md border text-left transition-colors",
            selected === "local"
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary/50"
          )}
        >
          <p className="text-xs font-medium text-muted-foreground mb-1">This Device</p>
          <p className="text-xs">{formatEntryDisplay(conflict.local)}</p>
        </button>
        <button
          onClick={() => onSelect("remote")}
          className={cn(
            "p-2 rounded-md border text-left transition-colors",
            selected === "remote"
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary/50"
          )}
        >
          <p className="text-xs font-medium text-muted-foreground mb-1">Other Device</p>
          <p className="text-xs">{formatEntryDisplay(conflict.remote)}</p>
        </button>
      </div>
    </Card>
  );
}
