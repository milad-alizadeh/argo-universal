import { realpath } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, sep } from 'node:path';
import {
  isRefusedVariable,
  type PluginCapability,
} from '@repo/contracts/plugins';
import { CapabilityRefusal } from './capability-refusal';

// The folders a resolved path may sit in, resolved themselves so symlinks in their own paths compare equal.
export type Roots = { data: string; projects: string[]; code: string | null };

export type ProcessCapability = Extract<
  PluginCapability,
  { kind: 'process:exec' }
>;

// The Server's variables every child gets (ADR-0030); everything else must be declared.
const inheritedVariables = ['PATH', 'HOME', 'LANG', 'TMPDIR'];

const missingCodes = new Set(['ENOENT', 'ENOTDIR']);

export function inside(target: string, root: string): boolean {
  const path = relative(root, target);

  return !isAbsolute(path) && path.split(sep).at(0) !== '..';
}

const inProject = (target: string, roots: Roots): boolean =>
  roots.projects.some((project) => inside(target, project));

// A write refusal: when it applies, and the reason the Plugin is told.
type WriteRule = {
  refuses: (target: string, roots: Roots) => boolean;
  reason: (target: string) => string;
};

// In order: the first rule that applies is the reason given. Deny beats allow (ADR-0030).
const writeRules: WriteRule[] = [
  {
    refuses: inProject,
    reason: (target) =>
      `${target} is in a Project; argo.fs never writes to a Project`,
  },
  {
    refuses: (target, { code }) => code !== null && inside(target, code),
    reason: (target) => `${target} is in the Plugin's code folder`,
  },
  {
    refuses: (target, { data }) => !inside(target, data),
    reason: (target) => `${target} is outside the Plugin's data folder`,
  },
  {
    // A `.git` folder would hand `git`, run with the data folder as its working directory, a config that runs programs.
    refuses: (target, { data }) =>
      relative(data, target)
        .split(sep)
        .some((part) => part.toLowerCase() === '.git'),
    reason: (target) => `${target} is a git folder`,
  },
];

export function allowWrite(target: string, roots: Roots): void {
  const refused = writeRules.find(({ refuses }) => refuses(target, roots));

  if (refused) throw new CapabilityRefusal(refused.reason(target));
}

// Any Plugin reads its data folder and every registered Project.
export function allowRead(target: string, roots: Roots): void {
  if (!inside(target, roots.data) && !inProject(target, roots))
    throw new CapabilityRefusal(
      `${target} is outside the Plugin's data folder and registered Projects`,
    );
}

// A hard link in the data folder could reach a file elsewhere; a Project's own links are the user's.
export function allowLinks(target: string, roots: Roots, links: number): void {
  if (links > 1 && !inProject(target, roots))
    throw new CapabilityRefusal(`${target} has other hard links`);
}

// The real path of the deepest part that exists, plus the rest: parts that don't exist yet hold no symlink.
export async function resolveReal(path: string): Promise<string> {
  return realpath(path).catch(
    async (error: NodeJS.ErrnoException): Promise<string> => {
      if (!resolvable(error, path)) throw error;

      return join(await resolveReal(dirname(path)), basename(path));
    },
  );
}

const resolvable = (error: NodeJS.ErrnoException, path: string): boolean =>
  missingCodes.has(String(error.code)) && dirname(path) !== path;

// `*` takes exactly one argument and a trailing `**` the rest; every other pattern is one exact argument.
export function argsMatch(
  patterns: readonly string[],
  args: readonly string[],
): boolean {
  const open = patterns.at(-1) === '**';
  const fixed = open ? patterns.slice(0, -1) : patterns;

  return (
    countFits(open, fixed.length, args.length) &&
    fixed.every((pattern, index) => argMatches(pattern, args[index]))
  );
}

const countFits = (open: boolean, fixed: number, given: number): boolean =>
  open ? given >= fixed : given === fixed;

const argMatches = (pattern: string, arg: string | undefined): boolean =>
  pattern === '*' ? arg !== undefined : pattern === arg;

// The child's whole environment: the inherited few, plus requested variables its command declares.
export function childEnvironment(
  requested: Record<string, string>,
  matching: readonly ProcessCapability[],
): Record<string, string> {
  const declared = new Set(
    matching.flatMap((capability) => capability.env ?? []),
  );

  for (const name of Object.keys(requested)) allowVariable(name, declared);

  return Object.assign(inherited(), requested);
}

function allowVariable(name: string, declared: ReadonlySet<string>): void {
  if (isRefusedVariable(name))
    throw new CapabilityRefusal(`${name} is never allowed`);

  if (!declared.has(name))
    throw new CapabilityRefusal(`${name} is not a declared variable`);
}

const inherited = (): Record<string, string> =>
  Object.fromEntries(
    inheritedVariables.flatMap((name) => {
      const value = process.env[name];

      return value === undefined ? [] : [[name, value]];
    }),
  );
