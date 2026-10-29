import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');

interface Fingerprint {
  sha256: string;
  files: number;
  bytes: number;
}

async function exportFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, {
    recursive: true,
    withFileTypes: true,
  });

  return entries
    .flatMap((entry) =>
      entry.isFile()
        ? [path.relative(directory, path.join(entry.parentPath, entry.name))]
        : [],
    )
    .toSorted();
}

async function fingerprint(
  directory: string,
  files: string[],
): Promise<Fingerprint> {
  const hash = createHash('sha256');
  let bytes = 0;

  for (const file of files) {
    const data = await readFile(path.join(directory, file));
    hash.update(`${file}\0${data.length}\0`).update(data);
    bytes += data.length;
  }

  return { sha256: hash.digest('hex'), files: files.length, bytes };
}

// Fingerprint the served export itself, since its build can predate the current Git revision.
async function exportFingerprint(): Promise<Fingerprint> {
  const directory = path.join(root, 'apps/universal-app/dist');

  return fingerprint(directory, await exportFiles(directory));
}

const git = (args: string[]): string =>
  execFileSync('/usr/bin/git', args, { cwd: root, encoding: 'utf8' }).trim();

interface Revision {
  commit: string;
  dirty: boolean;
}

function revision(): Revision {
  return {
    commit: git(['rev-parse', 'HEAD']),
    dirty: git(['status', '--porcelain']).length > 0,
  };
}

interface Machine {
  platform: string;
  release: string;
  arch: string;
  cpu: string;
  cores: number;
  memoryBytes: number;
  node: string;
}

interface Conditions {
  refreshHz: string;
  note: string;
}

export interface RenderingManifest extends Revision, Conditions {
  build: Fingerprint & { kind: 'production-web-export' };
  track: 'controlled-rendering';
  agent: string;
  system: Machine;
}

function machine(): Machine {
  return {
    platform: os.platform(),
    release: os.release(),
    arch: os.arch(),
    cpu: os.cpus()[0]?.model ?? 'unknown',
    cores: os.cpus().length,
    memoryBytes: os.totalmem(),
    node: process.version,
  };
}

const conditions = (): Conditions => ({
  refreshHz: process.env.PERF_REFRESH_HZ ?? 'not supplied',
  note: process.env.PERF_NOTE ?? '',
});

export async function renderingManifest(): Promise<RenderingManifest> {
  return {
    ...revision(),
    build: {
      kind: 'production-web-export' as const,
      ...(await exportFingerprint()),
    },
    track: 'controlled-rendering' as const,
    agent: 'scripted ACP fixture; no authenticated upstream Agent',
    system: machine(),
    ...conditions(),
  };
}
