import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Providers } from "@/components/providers";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-cabinet",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Council — Stock Decisions",
  description:
    "Multi-LLM council, technical analysis, sentiment, and reinforcement learning fused into a single Buy/Hold/Sell signal.",
  applicationName: "Council",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Council — Stock Decisions",
    description:
      "Multi-LLM council, technical analysis, sentiment, and reinforcement learning fused into a single Buy/Hold/Sell signal.",
    siteName: "Council",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Council — Stock Decisions",
    description:
      "Multi-LLM council, technical analysis, sentiment, and reinforcement learning fused into a single Buy/Hold/Sell signal.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9fafb" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} ${outfit.variable}`}
    >
      <body className="grain min-h-[100dvh] font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
