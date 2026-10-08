import path from 'node:path';
import { ResolverFactory, type NapiResolveOptions } from 'oxc-resolver';
import type { WorkspacePackages } from './packages.mts';
import { sourceExtensions } from './scan.mts';

export type ResolveSpecifier = (
  specifier: string,
  fromFile: string,
) => string | undefined;

export type BoundResolver = (specifier: string) => ReturnType<ResolveSpecifier>;

function workspaceDirectory(
  packages: WorkspacePackages,
  specifier: string,
): string | undefined {
  return [...packages.values()].find(
    (entry): boolean =>
      specifier === entry.name || specifier.startsWith(entry.name + '/'),
  )?.directory;
}

const resolutionOptions = {
  tsconfig: 'auto',
  extensions: [...sourceExtensions, '.d.ts'],
  conditionNames: [
    'default',
    'import',
    'react-native',
    'browser',
    'node',
    'types',
  ],
  extensionAlias: {
    '.js': ['.js', '.ts', '.tsx'],
    '.mjs': ['.mjs', '.mts', '.ts', '.tsx'],
    '.cjs': ['.cjs', '.cts', '.ts', '.tsx'],
  },
  symlinks: false,
} satisfies NapiResolveOptions;

export function createResolver(packages: WorkspacePackages): ResolveSpecifier {
  const resolver = new ResolverFactory(resolutionOptions);
  return (specifier, fromFile): string | undefined =>
    repositoryTarget(resolver.resolveFileSync(fromFile, specifier).path) ??
    workspaceTarget(resolver, packages, specifier);
}

function workspaceTarget(
  resolver: ResolverFactory,
  packages: WorkspacePackages,
  specifier: string,
): string | undefined {
  const directory = workspaceDirectory(packages, specifier);
  if (!directory) return;
  return repositoryTarget(
    resolver.resolveFileSync(path.join(directory, 'package.json'), specifier)
      .path,
  );
}

function repositoryTarget(file: string | undefined): string | undefined {
  if (!file) return;
  return file.split(path.sep).includes('node_modules') ? undefined : file;
}
