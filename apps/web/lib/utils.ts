import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPct(value: number, digits = 2) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(digits)}%`;
}

export function classifyMarket(symbol: string): "JSE" | "US" | "INDEX" {
  if (symbol.endsWith(".JO")) return "JSE";
  if (symbol.startsWith("^")) return "INDEX";
  return "US";
}
