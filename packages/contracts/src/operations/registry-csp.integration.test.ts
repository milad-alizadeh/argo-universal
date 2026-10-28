import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';
import { expect, it, onTestFinished } from 'vitest';
import { validRegistryEntry } from './registry-results.mocks';

const runnerSource = `import { RegistryEntry, InstalledAgentResult } from './results.mjs';
const entry = JSON.parse(process.argv[2]);
const installed = {id: entry.id, name: entry.name, version: entry.version, env: {}};
console.log(JSON.stringify({valid: RegistryEntry.safeParse(entry).success, invalid: RegistryEntry.safeParse({...entry, license_url: undefined}).success, installed: InstalledAgentResult.safeParse(installed).success, invalidEnvironment: InstalledAgentResult.safeParse({...installed, env: {TOKEN: 42}}).success}));`;

it('validates Registry results without runtime code generation in the browser bundle', () => {
  const directory = mkdtempSync(join(tmpdir(), 'argo-registry-csp-'));
  onTestFinished(() => rmSync(directory, { recursive: true, force: true }));

  const bundle = buildSync({
    entryPoints: [
      fileURLToPath(new URL('./registry-results.ts', import.meta.url)),
    ],
    bundle: true,
    platform: 'browser',
    format: 'esm',
    write: false,
  }).outputFiles[0]?.text;

  if (!bundle) throw new Error('Registry browser bundle was not produced.');
  writeFileSync(join(directory, 'results.mjs'), bundle);
  writeFileSync(join(directory, 'run.mjs'), runnerSource);

  const verdict = execFileSync(
    process.execPath,
    [
      '--disallow-code-generation-from-strings',
      join(directory, 'run.mjs'),
      JSON.stringify(validRegistryEntry),
    ],
    { encoding: 'utf8', timeout: 20_000 },
  );

  expect(verdict.trim()).toBe(
    '{"valid":true,"invalid":false,"installed":true,"invalidEnvironment":false}',
  );
}, 30_000);
