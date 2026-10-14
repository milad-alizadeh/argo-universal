import { mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { onTestFinished, vi } from 'vitest';

export type MachinePath = {
  directory: string;
  // Puts an executable with this file name on PATH, as an outside install would.
  place: (name: string) => Promise<string>;
  remove: (name: string) => Promise<void>;
};

// A private bin holding only this Node: Node's own directory also holds global npm CLIs, which must never count as installed.
const createNodeDirectory = (): string => {
  const directory = mkdtempSync(join(tmpdir(), 'argo-node-'));
  symlinkSync(process.execPath, join(directory, 'node'));
  process.once('exit', () =>
    rmSync(directory, { recursive: true, force: true }),
  );
  return directory;
};
const nodeDirectory = createNodeDirectory();
// System tools only, so the developer's own Agents and tools never count as installed.
const systemDirectories = ['/usr/bin', '/bin', '/usr/sbin', '/sbin'];
let machineDirectory: string | undefined;
let withNode = true;

// The PATH an Engine under test sees: the test's machine directory first, then this Node and system tools.
export const stubTestMachinePath = (): void => {
  const directories = [
    machineDirectory ?? [],
    withNode ? nodeDirectory : [],
    systemDirectories,
  ].flat();
  vi.stubEnv('PATH', directories.join(delimiter));
};

// "The machine": a temporary directory put first on PATH for this test only; `node: false` leaves Node.js off PATH.
export const createMachinePath = async (
  options: { node?: boolean } = {},
): Promise<MachinePath> => {
  const directory = await mkdtemp(join(tmpdir(), 'argo-path-'));
  machineDirectory = directory;
  withNode = options.node ?? true;
  stubTestMachinePath();
  onTestFinished(async () => {
    machineDirectory = undefined;
    withNode = true;
    await rm(directory, { recursive: true, force: true });
  });
  return {
    directory,
    place: async (name) => {
      const file = join(directory, name);
      await writeFile(file, '#!/bin/sh\nexit 0\n');
      await chmod(file, 0o755);
      return file;
    },
    remove: (name) => rm(join(directory, name), { force: true }),
  };
};
