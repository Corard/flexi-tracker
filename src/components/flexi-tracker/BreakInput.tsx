import { useState, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface BreakInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

export function BreakInput({ value, onChange, className }: BreakInputProps) {
  // null = not editing, use prop value; string = editing, use local value
  const [local, setLocal] = useState<string | null>(null);
  const displayValue = local ?? (value?.toString() || "0");

  const handleFocus = () => setLocal(value?.toString() || "0");

  const handleBlur = () => {
    const num = parseInt(local || "0", 10);
    const valid = isNaN(num) ? 0 : Math.max(0, num);
    onChange(valid);
    setLocal(null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  return (
    <div className={cn("flex items-center justify-center gap-1", className)}>
      <Input
        type="text"
        value={displayValue}
        onChange={(e) => setLocal(e.target.value.replace(/[^0-9]/g, ""))}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-12 bg-transparent text-center text-sm font-mono border-0 shadow-none h-auto px-1 py-0.5 focus:bg-muted/50"
      />
      <span className="text-xs text-muted-foreground">min break</span>
    </div>
  );
}
