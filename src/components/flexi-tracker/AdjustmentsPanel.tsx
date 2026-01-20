import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import type { Adjustment } from "@/types/flexi-tracker";
import { formatMinutes, formatMinutesDecimal } from "@/lib/flexi-tracker-utils";
import { cn } from "@/lib/utils";

interface AdjustmentsPanelProps {
  open: boolean;
  adjustments: Adjustment[];
  shiftHeld: boolean;
  onAdd: (adjustment: Adjustment) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function AdjustmentsPanel({
  open,
  adjustments,
  shiftHeld,
  onAdd,
  onDelete,
  onClose,
}: AdjustmentsPanelProps) {
  const [minutes, setMinutes] = useState("");
  const [note, setNote] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const fmtMinutes = shiftHeld ? formatMinutesDecimal : formatMinutes;

  const handleAdd = () => {
    const mins = parseInt(minutes, 10);
    if (isNaN(mins) || mins === 0) return;
    onAdd({
      id: Date.now().toString(),
      date: new Date().toISOString(),
      minutes: mins,
      note: note.trim() || "Manual adjustment",
    });
    setMinutes("");
    setNote("");
    setIsAdding(false);
  };

  const total = adjustments.reduce((sum, a) => sum + a.minutes, 0);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Flexi Adjustments</DialogTitle>
        </DialogHeader>

        {!isAdding ? (
          <Button
            variant="outline"
            className="w-full mb-4 border-dashed"
            onClick={() => setIsAdding(true)}
          >
            + Add Adjustment
          </Button>
        ) : (
          <Card className="mb-4 p-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Minutes (+/-)
              </label>
              <Input
                type="number"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="e.g. 60 or -30"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Note (optional)
              </label>
              <Input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Bank holiday, overtime"
              />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleAdd}>
                Add
              </Button>
              <Button variant="ghost" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
            </div>
          </Card>
        )}

        {adjustments.length > 0 ? (
          <div className="space-y-2">
            {adjustments.map((adj) => (
              <Card key={adj.id} className="flex items-center justify-between p-3 group">
                <div>
                  <div
                    className={cn(
                      "font-semibold",
                      adj.minutes > 0 && "text-emerald-600",
                      adj.minutes < 0 && "text-destructive"
                    )}
                  >
                    {fmtMinutes(adj.minutes)}
                  </div>
                  <div className="text-xs text-muted-foreground">{adj.note}</div>
                  <div className="text-xs text-muted-foreground/70">
                    {new Date(adj.date).toLocaleDateString()}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(adj.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground text-sm py-4">
            No adjustments yet. Add manual flexi time here.
          </p>
        )}

        {adjustments.length > 0 && (
          <div className="mt-4 pt-4 border-t text-center">
            <span className="text-sm text-muted-foreground">Total from adjustments: </span>
            <span
              className={cn(
                "font-semibold",
                total > 0 && "text-emerald-600",
                total < 0 && "text-destructive",
                total === 0 && "text-foreground"
              )}
            >
              {fmtMinutes(total)}
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
