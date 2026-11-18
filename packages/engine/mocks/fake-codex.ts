import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { onTestFinished } from 'vitest';

// How the stand-in `codex app-server` behaves once it has been started.
export type FakeCodexBehavior =
  // Answers `initialize`, then `getAuthStatus` with the sign-in.
  | { kind: 'answers'; authMethod: string | null; authToken: string | null }
  // Answers `initialize` and then never answers `getAuthStatus`.
  | { kind: 'silent' }
  // Exits as soon as it is asked to initialize.
  | { kind: 'exits' }
  // Prints lines that are not replies before and between the real ones.
  | { kind: 'noisy'; authMethod: string; authToken: string };

const programFile = fileURLToPath(
  new URL('./fake-codex-program.mjs', import.meta.url),
);

const launcher = (behavior: FakeCodexBehavior): string =>
  `#!/usr/bin/env node\nimport(${JSON.stringify(programFile)}).then((program) => program.run(${JSON.stringify(behavior)}));\n`;

// Writes a stand-in `codex` program for this test, and removes it when the test ends.
export function fakeCodex(behavior: FakeCodexBehavior): () => string {
  const directory = mkdtempSync(path.join(tmpdir(), 'fake-codex-'));
  const program = path.join(directory, 'codex');
  writeFileSync(program, launcher(behavior));
  chmodSync(program, 0o755);
  onTestFinished(() => rmSync(directory, { recursive: true, force: true }));

  return () => program;
}
