import { useState, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { parseTime } from "@/lib/flexi-tracker-utils";
import { cn } from "@/lib/utils";

interface TimeInputProps {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  placeholder?: string;
  className?: string;
}

export function TimeInput({ value, onChange, placeholder, className }: TimeInputProps) {
  // null = not editing, use prop value; string = editing, use local value
  const [local, setLocal] = useState<string | null>(null);
  const displayValue = local ?? (value || "");

  const handleFocus = () => setLocal(value || "");

  const handleBlur = () => {
    const parsed = parseTime(local || "");
    onChange(parsed);
    setLocal(null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  return (
    <Input
      type="text"
      value={displayValue}
      onChange={(e) => setLocal(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={cn(
        "w-full bg-transparent text-center text-lg font-mono",
        "placeholder:text-muted-foreground/50 focus:bg-muted/50",
        "border-0 shadow-none h-auto px-1 py-0.5",
        className
      )}
    />
  );
}
