import Link from "next/link";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";

export const dynamic = "force-dynamic";

const APP_VERSION = "v0.1.4";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh]">
      <header className="sticky top-0 z-30 border-b border-zinc-200/70 bg-canvas/80 backdrop-blur-xl dark:border-zinc-800/80">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-6 px-4 py-4 md:px-8">
          <div className="flex flex-col">
            <Link href="/" className="font-display text-lg tracking-tight text-ink">
              Council
            </Link>
            <span className="font-mono text-[11px] uppercase tracking-widest text-steel">
              Quant desk · {APP_VERSION}
            </span>
          </div>
          <nav className="flex items-center gap-2 md:gap-4">
            <Link
              href="/"
              className="rounded-lg px-3 py-2 text-sm text-steel hover:bg-muted/80 hover:text-ink"
            >
              Dashboard
            </Link>
            <Link
              href="/watchlist"
              className="rounded-lg px-3 py-2 text-sm text-steel hover:bg-muted/80 hover:text-ink"
            >
              Watchlist
            </Link>
            <Link
              href="/scan"
              className="rounded-lg px-3 py-2 text-sm text-steel hover:bg-muted/80 hover:text-ink"
            >
              Scan
            </Link>
            <Link
              href="/settings"
              className="rounded-lg px-3 py-2 text-sm text-steel hover:bg-muted/80 hover:text-ink"
            >
              Settings
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-4 py-8 md:px-8">{children}</main>
    </div>
  );
}
