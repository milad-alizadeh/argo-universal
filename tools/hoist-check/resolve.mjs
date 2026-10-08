import fs from 'node:fs';
import path from 'node:path';
import { matchMap, wildcardMatch } from './export-maps.mjs';
import { packageOfFile } from './packages.mjs';
import { sourceExtensions } from './scan.mjs';

function isFile(file) {
  return fs.existsSync(file) && fs.statSync(file).isFile();
}

function javascriptSources(candidate) {
  if (!/\.(?:js|mjs|cjs)$/.test(candidate)) return [];
  return ['.ts', '.tsx'].map((extension) =>
    candidate.replace(/\.(?:js|mjs|cjs)$/, extension),
  );
}

function resolveFile(candidate) {
  return [
    candidate,
    ...sourceExtensions.map((extension) => candidate + extension),
    ...sourceExtensions.map((extension) =>
      path.join(candidate, `index${extension}`),
    ),
    ...javascriptSources(candidate),
    `${candidate}.d.ts`,
  ].find(isFile);
}

function pathTarget(pattern, targets, specifier) {
  return pattern.includes('*')
    ? wildcardPath(pattern, targets, specifier)
    : exactPath(pattern, targets, specifier);
}

function exactPath(pattern, targets, specifier) {
  return specifier === pattern ? targets[0] : undefined;
}

function wildcardPath(pattern, targets, specifier) {
  const middle = wildcardMatch(pattern, specifier);
  if (middle === undefined) return;
  return targets[0]?.replace('*', middle);
}

function resolveThroughPaths(owner, specifier) {
  if (!owner) return;
  return Object.entries(owner.paths)
    .map(([pattern, targets]) => pathTarget(pattern, targets, specifier))
    .filter(Boolean)
    .map((target) => resolveFile(path.resolve(owner.directory, target)))
    .find(Boolean);
}

function packageTarget(owner, subpath) {
  const fallback = subpath === '.' ? packageMain(owner) : subpath;
  return matchMap(owner.manifest.exports, subpath) ?? fallback;
}

function resolveWorkspacePackage(packages, specifier) {
  const match = specifier.match(/^(@[^/]+\/[^/]+|[^@/][^/]*)(\/.*)?$/);
  if (!match) return;
  const owner = packages.get(match[1]);
  if (!owner) return;
  return resolveFile(
    path.resolve(owner.directory, packageTarget(owner, packageSubpath(match))),
  );
}

function resolvePackageImport(owner, specifier) {
  if (!owner) return;
  const target = matchMap(owner.manifest.imports, specifier);
  return target
    ? resolveFile(path.resolve(owner.directory, target))
    : undefined;
}

function resolveSpecifier(packages, specifier, fromFile) {
  if (specifier.startsWith('.'))
    return resolveFile(path.resolve(path.dirname(fromFile), specifier));
  const owner = packageOfFile(packages, fromFile);
  if (specifier.startsWith('#')) return resolvePackageImport(owner, specifier);
  return resolveBareSpecifier(packages, owner, specifier);
}

export function createResolver(packages) {
  return (specifier, fromFile) =>
    resolveSpecifier(packages, specifier, fromFile);
}

function packageMain(owner) {
  return owner.manifest.main ?? 'index';
}

function packageSubpath(match) {
  return `.${match[2] ?? ''}`;
}

function resolveBareSpecifier(packages, owner, specifier) {
  return (
    resolveThroughPaths(owner, specifier) ??
    resolveWorkspacePackage(packages, specifier)
  );
}
