"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

export function TooltipProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipPrimitive.Provider delayDuration={120}>{children}</TooltipPrimitive.Provider>
  );
}

export function Tooltip({
  children,
  label,
  side = "top",
}: {
  children: React.ReactNode;
  label: string;
  side?: "top" | "bottom";
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          className={cn(
            "z-40 max-w-xs rounded-lg border border-zinc-200/70 bg-surface px-3 py-2 text-xs text-ink shadow-diffuse",
          )}
        >
          {label}
          <TooltipPrimitive.Arrow className="fill-surface" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
