"use client";

import { Button } from "@/components/ui/button";
import type { Horizon } from "@/lib/llm/schema";

const OPTIONS: Array<{ value: Horizon; label: string }> = [
  { value: "days", label: "Days" },
  { value: "weeks", label: "Weeks" },
  { value: "months", label: "Months" },
  { value: "years", label: "Years" },
];

export function HorizonPicker({
  value,
  onChange,
  compact = false,
}: {
  value: Horizon;
  onChange: (horizon: Horizon) => void;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "flex flex-col gap-1.5" : "flex flex-col gap-2"}>
      <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-steel">
        Horizon
      </span>
      <div className="flex flex-wrap gap-1.5">
        {OPTIONS.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            className={compact ? "h-7 px-2 text-xs" : undefined}
            variant={value === option.value ? "default" : "outline"}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
