import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";

describe("rl env step (python)", () => {
  it("buy opens position and sell closes", () => {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
    const py = path.join(root, "services/ml/.venv/bin/python");
    const script = path.join(root, "tests/py_rl_env_step.py");
    execFileSync(py, [script], { stdio: "inherit", cwd: root });
  });
});
