"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ThemeProvider } from "next-themes";
import { useMemo } from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  const convex = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) return null;
    return new ConvexReactClient(url);
  }, []);

  const tree = (
    <TooltipPrimitive.Provider delayDuration={120}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange={false}
      >
        {children}
      </ThemeProvider>
    </TooltipPrimitive.Provider>
  );

  if (!convex) return tree;
  return <ConvexProvider client={convex}>{tree}</ConvexProvider>;
}
