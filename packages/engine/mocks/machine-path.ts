import { mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import {
  chmod,
  mkdir,
  mkdtemp,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { onTestFinished, vi } from 'vitest';

export type NpmPackage = { name: string; version: string };

export type MachinePath = {
  directory: string;
  // Puts an executable with this file name on PATH, as an outside install would.
  place: (name: string) => Promise<string>;
  // Installs an npm package's command the way `npm install -g` does: a PATH link into the package's own folder beside its package.json.
  placePackage: (name: string, npmPackage: NpmPackage) => Promise<string>;
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

const writeExecutable = async (file: string): Promise<string> => {
  await writeFile(file, '#!/bin/sh\nexit 0\n');
  await chmod(file, 0o755);

  return file;
};

// "The machine": a temporary bin directory put first on PATH for this test only, with npm's global packages beside it; `node: false` leaves Node.js off PATH.
export const createMachinePath = async (
  options: { node?: boolean } = {},
): Promise<MachinePath> => {
  const root = await mkdtemp(join(tmpdir(), 'argo-path-'));
  const directory = join(root, 'bin');
  await mkdir(directory);
  machineDirectory = directory;
  withNode = options.node ?? true;
  stubTestMachinePath();
  onTestFinished(async () => {
    machineDirectory = undefined;
    withNode = true;
    await rm(root, { recursive: true, force: true });
  });

  return {
    directory,
    place: (name) => writeExecutable(join(directory, name)),
    placePackage: async (name, npmPackage) => {
      const folder = join(root, 'lib', 'node_modules', npmPackage.name);
      await mkdir(join(folder, 'bin'), { recursive: true });
      await writeFile(join(folder, 'package.json'), JSON.stringify(npmPackage));
      const file = join(directory, name);
      await symlink(await writeExecutable(join(folder, 'bin', name)), file);

      return file;
    },
    remove: (name) => rm(join(directory, name), { force: true }),
  };
};
