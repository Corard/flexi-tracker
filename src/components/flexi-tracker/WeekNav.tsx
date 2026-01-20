import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface WeekNavProps {
  currentDate: Date;
  onChange: (date: Date) => void;
}

export function WeekNav({ currentDate, onChange }: WeekNavProps) {
  const month = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const weekNum = Math.ceil(
    (currentDate.getDate() +
      new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()) /
      7
  );

  const navigate = (weeks: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + weeks * 7);
    onChange(d);
  };

  const goToToday = () => onChange(new Date());

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="text-muted-foreground"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(1)}
          className="text-muted-foreground"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="text-center">
        <div className="text-xl font-semibold">{month}</div>
        <div className="text-sm text-muted-foreground">Week {weekNum}</div>
      </div>

      <Button variant="ghost" onClick={goToToday} className="text-muted-foreground">
        Today
      </Button>
    </div>
  );
}
