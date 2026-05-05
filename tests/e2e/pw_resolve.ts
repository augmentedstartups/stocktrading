import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

export function repoRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
}

export function loadPlaywright(): typeof import("playwright") {
  const root = repoRoot();
  return require(require.resolve("playwright", { paths: [path.join(root, "apps/web")] }));
}

export function axeMinJsPath(): string {
  const root = repoRoot();
  return require.resolve("axe-core/axe.min.js", {
    paths: [path.join(root, "apps/web")],
  });
}
