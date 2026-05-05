"use client";

import { Moon, Sun } from "@phosphor-icons/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dark = theme === "dark";
  const label = mounted
    ? dark
      ? "Switch to light mode"
      : "Switch to dark mode"
    : "Toggle theme";
  const icon = mounted && dark ? (
    <Sun size={20} weight="regular" />
  ) : (
    <Moon size={20} weight="regular" />
  );

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={label}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {icon}
    </Button>
  );
}
