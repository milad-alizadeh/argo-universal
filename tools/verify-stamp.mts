// What `pnpm verify` last passed, so before-stop does not lint and type-check the same tree again (docs/agents/hooks.md).
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { parseJson, root, run } from './hook-checks.mts';

const stampSchema = z.object({
  head: z.string(),
  files: z.record(z.string(), z.string()),
});

export type VerifiedStamp = z.infer<typeof stampSchema>;

// The stamp holds HEAD, so a commit or checkout after verify voids it, and each checked file's content hash.
export function covers(stamp: VerifiedStamp, current: VerifiedStamp): boolean {
  return (
    stamp.head === current.head &&
    Object.entries(current.files).every(
      ([file, hash]): boolean => stamp.files[file] === hash,
    )
  );
}

const git = (args: string[]): string => run('git', args).output.trim();

// In .git, per worktree, so it is never committed and each worktree keeps its own.
const stampPath = (): string =>
  path.resolve(root, git(['rev-parse', '--git-path', 'argo-verified.json']));

function snapshot(files: string[]): VerifiedStamp {
  const hashes =
    files.length === 0 ? [] : git(['hash-object', '--', ...files]).split('\n');

  return {
    head: git(['rev-parse', 'HEAD']),
    files: Object.fromEntries(
      files.map((file, index): [string, string] => [file, hashes[index] ?? '']),
    ),
  };
}

export function recordVerified(files: string[]): void {
  writeFileSync(stampPath(), JSON.stringify(snapshot(files)));
}

function readStamp(): VerifiedStamp | undefined {
  try {
    const parsed = parseJson(stampSchema, readFileSync(stampPath(), 'utf8'));

    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

// Whether verify's lint and type checks already passed for these files as they are now.
export function verifiedAlready(files: string[]): boolean {
  const stamp = readStamp();

  return stamp !== undefined && covers(stamp, snapshot(files));
}
