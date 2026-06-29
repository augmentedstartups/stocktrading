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
  className,
}: {
  children: React.ReactNode;
  label: React.ReactNode;
  side?: "top" | "bottom";
  className?: string;
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          className={cn(
            "z-40 max-w-xs rounded-lg border border-zinc-200/70 bg-surface px-3 py-2 text-xs leading-relaxed text-ink shadow-diffuse dark:border-zinc-800/80",
            className,
          )}
        >
          {label}
          <TooltipPrimitive.Arrow className="fill-surface" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
