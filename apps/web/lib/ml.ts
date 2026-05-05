const base = () =>
  process.env.ML_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_ML_URL ??
  "http://localhost:8000";

export async function mlGet<T>(path: string): Promise<T> {
  const r = await fetch(`${base()}${path}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`${path} ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}

export async function mlPost<T>(path: string): Promise<T> {
  const r = await fetch(`${base()}${path}`, { method: "POST", cache: "no-store" });
  if (!r.ok) throw new Error(`${path} ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}
