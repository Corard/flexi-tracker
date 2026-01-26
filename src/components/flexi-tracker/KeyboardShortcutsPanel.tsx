import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";

interface KeyboardShortcutsPanelProps {
  open: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: ShortcutItem[];
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: "Navigation",
    shortcuts: [
      { keys: ["←"], description: "Previous week" },
      { keys: ["→"], description: "Next week" },
      { keys: ["T"], description: "Jump to today" },
      { keys: ["1", "-", "7"], description: "Select day" },
    ],
  },
  {
    title: "Quick Actions",
    shortcuts: [
      { keys: ["P"], description: "Open presets" },
      { keys: ["I"], description: "Clock in" },
      { keys: ["O"], description: "Clock out" },
    ],
  },
  {
    title: "Presets (when menu open)",
    shortcuts: [
      { keys: ["Y"], description: "Copy yesterday" },
      { keys: ["N"], description: "Normal" },
      { keys: ["X"], description: "Clear day" },
      { keys: ["S"], description: "Sick day" },
      { keys: ["Shift", "S"], description: "Half sick" },
      { keys: ["H"], description: "Holiday" },
      { keys: ["Shift", "H"], description: "Half holiday" },
      { keys: ["F"], description: "Flexi day" },
      { keys: ["Shift", "F"], description: "Half flexi" },
    ],
  },
  {
    title: "Panels",
    shortcuts: [
      { keys: [","], description: "Settings" },
      { keys: ["A"], description: "Adjustments" },
      { keys: ["Esc"], description: "Close panel" },
    ],
  },
  {
    title: "Display",
    shortcuts: [{ keys: ["Shift"], description: "Hold for decimal hours" }],
  },
];

export function KeyboardShortcutsPanel({ open, onClose }: KeyboardShortcutsPanelProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {shortcutGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {group.title}
              </h3>
              <div className="space-y-1.5">
                {group.shortcuts.map((shortcut, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-1 px-2 rounded hover:bg-muted/50"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-0.5">
                      {shortcut.keys.map((key, j) =>
                        key === "-" ? (
                          <span key={j} className="text-muted-foreground text-xs mx-0.5">
                            -
                          </span>
                        ) : (
                          <Kbd key={j}>{key}</Kbd>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
