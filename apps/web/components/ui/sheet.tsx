"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export function Sheet({
  open,
  onOpenChange,
  title,
  children,
  side = "right",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  children: React.ReactNode;
  side?: "right" | "bottom";
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-zinc-950/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            "fixed z-50 bg-surface shadow-diffuse outline-none",
            side === "right" &&
              "right-0 top-0 h-full w-full max-w-md border-l border-zinc-200/70 p-6 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
            side === "bottom" &&
              "bottom-0 left-0 w-full max-h-[85dvh] rounded-t-bento border-t border-zinc-200/70 p-6 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
          )}
        >
          <div className="mb-6 flex items-start justify-between gap-4">
            <Dialog.Title className="font-display text-xl tracking-tight text-ink">
              {title}
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close panel">
                <X size={22} weight="regular" />
              </Button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">
            {title}
          </Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
