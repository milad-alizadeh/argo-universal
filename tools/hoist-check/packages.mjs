import fs from 'node:fs';
import path from 'node:path';
import { readJson } from './scan.mjs';

function packageDirectories(root, group) {
  const directory = path.join(root, group);
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory).map((name) => path.join(directory, name));
}

function compilerPaths(directory) {
  const config = readJson(path.join(directory, 'tsconfig.json'));
  if (!config) return {};
  return configPaths(config);
}

function workspacePackage(directory) {
  const manifest = readJson(path.join(directory, 'package.json'));
  if (!manifest) return [];
  if (typeof manifest.name !== 'string') return [];
  return [
    [manifest.name, { directory, manifest, paths: compilerPaths(directory) }],
  ];
}

export function readPackages(root) {
  const directories = ['apps', 'packages', 'tooling'].flatMap((group) =>
    packageDirectories(root, group),
  );
  directories.push(
    ...['e2e', 'mocks', 'tools'].map((name) => path.join(root, name)),
  );
  return new Map(directories.flatMap(workspacePackage));
}

export function packageOfFile(packages, file) {
  return [...packages.values()]
    .filter((entry) => file.startsWith(entry.directory + path.sep))
    .sort((a, b) => b.directory.length - a.directory.length)[0];
}

function configPaths(config) {
  return (config.compilerOptions ?? {}).paths ?? {};
}
