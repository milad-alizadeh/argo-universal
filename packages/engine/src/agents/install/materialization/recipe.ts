import type { ACPAgent, RegistrySupport } from '@repo/contracts';
import { requireExactPackageVersion } from './package-version';
type RecipeLaunch = { args: readonly string[]; env: Record<string, string> };
export type InstallRecipe = RecipeLaunch &
  (
    | { kind: 'binary'; archive: string; sha256?: string; cmd: string }
    | { kind: 'npx' | 'uvx'; package: string; name: string; version: string }
  );
const packageSeparators = { npx: '@', uvx: '==' };
const requirePackageName = (name: string, kind: 'npx' | 'uvx'): void => {
  const pattern = kind === 'npx' ? /^(?:@[\w.-]+\/)?[\w.-]+$/ : /^[\w.-]+$/;
  if (!pattern.test(name))
    throw new Error('Registry package name is malformed');
};
const recipeSeparator = (kind: 'npx' | 'uvx', specification: string): string =>
  kind === 'uvx' && specification.includes('==') ? '==' : '@';
const splitPackage = (
  entry: ACPAgent,
  kind: 'npx' | 'uvx',
  specification: string,
): { name: string; version: string } => {
  const separator = recipeSeparator(kind, specification),
    at = specification.lastIndexOf(separator);
  const pinned = at > 0;
  const name = pinned ? specification.slice(0, at) : specification;
  const version = pinned
    ? specification.slice(at + separator.length)
    : entry.version;
  requirePackageName(name, kind);
  return { name, version: requireExactPackageVersion(version, kind) };
};
const recipeLaunch = (recipe: {
  args?: string[];
  env?: Record<string, string>;
}): RecipeLaunch => ({ args: recipe.args ?? [], env: recipe.env ?? {} });
type PackageSupport = Extract<RegistrySupport, { kind: 'npx' | 'uvx' }>;
const pinnedRecipe = (
  support: PackageSupport,
  release: { name: string; version: string },
): InstallRecipe => ({
  ...recipeLaunch(support.recipe),
  ...release,
  kind: support.kind,
  package: `${release.name}${packageSeparators[support.kind]}${release.version}`,
});
const packageRecipe = (
  entry: ACPAgent,
  support: PackageSupport,
): InstallRecipe =>
  pinnedRecipe(
    support,
    splitPackage(entry, support.kind, support.recipe.package),
  );
export const resolveInstallRecipe = (
  entry: ACPAgent,
  support: RegistrySupport,
): InstallRecipe => {
  if (support.kind === 'unsupported') throw new Error(support.reason);
  if (support.kind !== 'binary') return packageRecipe(entry, support);
  return { ...support.recipe, ...recipeLaunch(support.recipe), kind: 'binary' };
};
