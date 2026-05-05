import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const variants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-chip text-sm font-medium transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas active:scale-[0.98] active:translate-y-px disabled:pointer-events-none disabled:opacity-50 min-h-11 min-w-11",
  {
    variants: {
      variant: {
        default: "bg-accent text-white shadow-diffuse hover:opacity-95",
        secondary:
          "bg-surface text-ink border border-zinc-200/70 shadow-sm hover:bg-muted",
        ghost: "text-ink hover:bg-muted/80",
        outline:
          "border border-zinc-200/80 bg-surface/60 text-ink hover:border-zinc-300/90",
        glass:
          "glass text-ink border border-white/50 shadow-diffuse hover:bg-surface/80",
      },
      size: {
        sm: "h-9 px-3",
        md: "h-11 px-4",
        lg: "h-12 px-6 text-base",
        icon: "h-11 w-11 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof variants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(variants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, variants as buttonVariants };
