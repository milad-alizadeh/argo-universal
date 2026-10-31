import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { RealAgentChoice } from './real-agent-choice.mts';

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

/*
 * What a run records about the Agent it drove. The fixture suites replay a scripted ACP Agent at a
 * fixed rate; a real-Agent run states its Agent and the model it was pinned to, since the pin is
 * what makes the run affordable and a reader cannot tell from frame timings which model answered.
 */
export const fixtureAgentCondition =
  'scripted ACP fixture; no authenticated upstream Agent';

export const realAgentCondition = ({ id, pin }: RealAgentChoice): string => {
  const pinned = pin
    .map(({ configId, value }): string => `${configId} ${value}`)
    .join(' and ');

  return `installed Registry Agent ${id}, pinned to ${pinned} before its first prompt; authenticated by the owner's own signed-in Agent credentials`;
};

const conditions = (): Conditions => ({
  refreshHz: process.env.PERF_REFRESH_HZ ?? 'not supplied',
  note: process.env.PERF_NOTE ?? '',
});

// `agent` is the run's own Agent condition: a suite that drives a real Agent passes its own.
export async function renderingManifest(
  agent: string = fixtureAgentCondition,
): Promise<RenderingManifest> {
  return {
    ...revision(),
    build: {
      kind: 'production-web-export' as const,
      ...(await exportFingerprint()),
    },
    track: 'controlled-rendering' as const,
    agent,
    system: machine(),
    ...conditions(),
  };
}
