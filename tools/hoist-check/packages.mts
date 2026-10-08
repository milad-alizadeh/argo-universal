import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { readJson } from './scan.mts';

const packageManifest = z.object({ name: z.string() });
export type WorkspacePackage = z.infer<typeof packageManifest> & {
  directory: string;
};
export type WorkspacePackages = Map<string, WorkspacePackage>;

function packageDirectories(root: string, group: string): string[] {
  const directory = path.join(root, group);
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory)
    .map((name): string => path.join(directory, name));
}

function workspacePackage(directory: string): [string, WorkspacePackage][] {
  const parsed = packageManifest.safeParse(
    readJson(path.join(directory, 'package.json')),
  );
  return parsed.success
    ? [[parsed.data.name, { directory, name: parsed.data.name }]]
    : [];
}

export function readPackages(root: string): WorkspacePackages {
  const directories = ['apps', 'packages', 'tooling'].flatMap(
    (group): string[] => packageDirectories(root, group),
  );
  directories.push(
    ...['e2e', 'mocks', 'tools'].map((name): string => path.join(root, name)),
  );
  return new Map(directories.flatMap(workspacePackage));
}

export function packageOfFile(
  packages: WorkspacePackages,
  file: string,
): WorkspacePackage | undefined {
  return [...packages.values()]
    .filter((entry): boolean => file.startsWith(entry.directory + path.sep))
    .sort((a, b): number => b.directory.length - a.directory.length)[0];
}
