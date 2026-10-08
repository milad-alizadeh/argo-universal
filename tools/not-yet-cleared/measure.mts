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
import { parseJsonc } from './document.mts';

const rootConfigSchema = z.looseObject({ extends: z.array(z.string()) });
const waiverConfig = 'tooling/oxlint/not-yet-cleared.json';

function measuringConfig(root: string): string {
  const config = rootConfigSchema.parse(
    parseJsonc(readFileSync(join(root, '.oxlintrc.json'), 'utf8')),
  );
  return JSON.stringify({
    ...config,
    extends: config.extends
      .filter(
        (path): boolean => resolve(root, path) !== join(root, waiverConfig),
      )
      .map((path): string => resolve(root, path)),
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

export function measureFindings(root: string): string {
  const directory = mkdtempSync(join(tmpdir(), 'not-yet-cleared-'));
  const config = join(directory, 'oxlint.json');
  const link = join(root, `.oxlintrc-not-yet-cleared-${randomUUID()}.json`);
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
