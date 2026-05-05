import { TickerDetail } from "@/components/dashboard/TickerDetail";

export default async function Page({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  return <TickerDetail symbol={decodeURIComponent(symbol)} />;
}
