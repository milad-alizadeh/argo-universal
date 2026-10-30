import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { z } from 'zod';
import { parseJsonc } from './parse-jsonc.mts';
import { readAllowlist } from './rule-allowlist.mts';

const rootConfigSchema = z.looseObject({
  extends: z.array(z.string()),
  overrides: z.array(z.unknown()).optional(),
});

function allowlistedFiles(root: string): string[] {
  return readAllowlist(
    readFileSync(
      join(root, 'tooling/oxlint/kit-styling-allowlist.json'),
      'utf8',
    ),
    'argo/kit-styling',
  );
}

function measuringConfig(root: string): string {
  const config = parseJsonc(
    rootConfigSchema,
    readFileSync(join(root, '.oxlintrc.json'), 'utf8'),
  );

  return JSON.stringify({
    ...config,
    extends: config.extends.map((path): string => resolve(root, path)),
    overrides: [
      ...(config.overrides ?? []),
      { files: allowlistedFiles(root), rules: { 'argo/kit-styling': 'error' } },
    ],
  });
}

function isLintExit(status: number | null): boolean {
  return status === 0 || status === 1;
}

function runOxlint(root: string, config: string): string {
  const result = spawnSync(
    join(root, 'node_modules/.bin/oxlint'),
    ['-c', config, '--type-aware', '--format=json'],
    { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );

  if (result.error) throw result.error;

  if (!isLintExit(result.status))
    throw new Error(
      `oxlint failed (${result.status}): ${result.stderr}${result.stdout}`,
    );

  return result.stdout;
}

// Lint with the allowlisted rule enabled to find stale entries.
export function measureFindings(root: string): string {
  const directory = mkdtempSync(join(tmpdir(), 'argo-allowlist-'));
  const config = join(directory, 'oxlint.json');
  const link = join(root, `.oxlintrc-allowlist-${randomUUID()}.json`);

  try {
    writeFileSync(config, measuringConfig(root));
    // Oxlint resolves override globs against the config path, even when extends are absolute.
    symlinkSync(config, link);

    return runOxlint(root, link);
  } finally {
    rmSync(link, { force: true });
    rmSync(directory, { recursive: true, force: true });
  }
}
