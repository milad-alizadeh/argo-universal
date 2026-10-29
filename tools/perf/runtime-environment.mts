import { execFileSync } from 'node:child_process';
import { stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');

const git = (args: string[]): string =>
  execFileSync('/usr/bin/git', args, { cwd: root, encoding: 'utf8' }).trim();

export async function pathCondition(
  file: string,
): Promise<{ path: string; exists: boolean; directory: boolean }> {
  try {
    const value = await stat(file);

    return { path: file, exists: true, directory: value.isDirectory() };
  } catch {
    return { path: file, exists: false, directory: false };
  }
}

export function observerMetadata(): ObserverMetadata {
  return {
    observerCommit: git(['rev-parse', 'HEAD']),
    observerDirty: Boolean(git(['status', '--porcelain'])),
    node: process.version,
    platform: os.platform(),
    release: os.release(),
    arch: os.arch(),
  };
}

export interface ObserverMetadata {
  observerCommit: string;
  observerDirty: boolean;
  node: string;
  platform: string;
  release: string;
  arch: string;
}
