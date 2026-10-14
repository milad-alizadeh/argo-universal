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
import { guardInsideRoot } from './inside-root';

export type NpmPackage = { name: string; version: string };

export type HomebrewFormula = { name: string; version: string };

export type MachinePath = {
  directory: string;
  // Puts an executable with this file name on PATH, as an outside install would.
  place: (name: string) => Promise<string>;
  // Installs an npm package's command the way `npm install -g` does: a PATH link into the package's own folder beside its package.json.
  placePackage: (name: string, npmPackage: NpmPackage) => Promise<string>;
  // Installs a command the way `brew install` does: a PATH link into the formula's versioned Cellar folder.
  placeFormula: (name: string, formula: HomebrewFormula) => Promise<string>;
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

const writeExecutable = async (root: string, file: string): Promise<string> => {
  await guardInsideRoot(root, file);
  await writeFile(file, '#!/bin/sh\nexit 0\n');
  await chmod(file, 0o755);

  return file;
};

// Replaces a PATH entry with a link to the installed file; the old entry is removed, never written through.
const linkInto = async (
  root: string,
  file: string,
  installed: string,
): Promise<string> => {
  await rm(await guardInsideRoot(root, file), { force: true });
  await symlink(installed, file);

  return file;
};

const makeFolder = async (root: string, folder: string): Promise<void> => {
  await mkdir(await guardInsideRoot(root, folder), { recursive: true });
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
    place: (name) => writeExecutable(root, join(directory, name)),
    placePackage: async (name, npmPackage) => {
      const folder = join(root, 'lib', 'node_modules', npmPackage.name);
      await makeFolder(root, join(folder, 'bin'));
      await writeFile(
        await guardInsideRoot(root, join(folder, 'package.json')),
        JSON.stringify(npmPackage),
      );
      const installed = await writeExecutable(root, join(folder, 'bin', name));

      return linkInto(root, join(directory, name), installed);
    },
    placeFormula: async (name, formula) => {
      const folder = join(root, 'Cellar', formula.name, formula.version, 'bin');
      await makeFolder(root, folder);
      const installed = await writeExecutable(root, join(folder, name));

      return linkInto(root, join(directory, name), installed);
    },
    remove: async (name) => {
      await rm(await guardInsideRoot(root, join(directory, name)), {
        force: true,
      });
    },
  };
};
