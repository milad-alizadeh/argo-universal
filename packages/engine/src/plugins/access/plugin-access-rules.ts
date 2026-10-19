import { realpath } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, sep } from 'node:path';
import {
  isRefusedVariable,
  type ProcessCapability,
} from '@repo/contracts/plugins';
import { CapabilityRefusal } from './capability-refusal';

// The folders a resolved path may sit in, resolved themselves so symlinks in their own paths compare equal.
export type Roots = { data: string; projects: string[]; code: string | null };

// The Server's variables every child gets (ADR-0030); everything else must be declared.
const inheritedVariables = ['PATH', 'HOME', 'LANG', 'TMPDIR'];

const missingCodes = new Set(['ENOENT', 'ENOTDIR']);

export function inside(target: string, root: string): boolean {
  const path = relative(root, target);

  return !isAbsolute(path) && path.split(sep).at(0) !== '..';
}

const inProject = (target: string, roots: Roots): boolean =>
  roots.projects.some((project) => inside(target, project));

// A write refusal: when it applies, and the reason the Plugin is told about the path it asked for.
type WriteRule = {
  refuses: (target: string, roots: Roots) => boolean;
  reason: (shown: string) => string;
};

// Names git reads as a repository: a `.git` entry, or a `HEAD` file, which makes its folder a bare repository.
const gitNames = new Set(['.git', 'head']);

// In order: the first rule that applies is the reason given. Deny beats allow (ADR-0030).
const writeRules: WriteRule[] = [
  {
    refuses: inProject,
    reason: (shown) =>
      `${shown} is in a Project; argo.fs never writes to a Project`,
  },
  {
    refuses: (target, { code }) => code !== null && inside(target, code),
    reason: (shown) => `${shown} is in the Plugin's code folder`,
  },
  {
    refuses: (target, { data }) => !inside(target, data),
    reason: (shown) => `${shown} is outside the Plugin's data folder`,
  },
  {
    // A repository would hand `git`, or `gh` calling it, run with the data folder as its working directory, a config that runs programs.
    refuses: (target, { data }) =>
      relative(data, target)
        .split(sep)
        .some((part) => gitNames.has(part.toLowerCase())),
    reason: (shown) => `${shown} would make a git repository`,
  },
];

/*
 * What a check is about: the resolved target, and the path to name in its reason, the one the
 * Plugin asked for, so a refusal never tells it where a symlink leads.
 */
export type Subject = { target: string; shown: string };

export function allowWrite({ target, shown }: Subject, roots: Roots): void {
  const refused = writeRules.find(({ refuses }) => refuses(target, roots));

  if (refused) throw new CapabilityRefusal(refused.reason(shown));
}

// Any Plugin reads its data folder and every registered Project.
export function allowRead({ target, shown }: Subject, roots: Roots): void {
  if (!inside(target, roots.data) && !inProject(target, roots))
    throw new CapabilityRefusal(
      `${shown} is outside the Plugin's data folder and registered Projects`,
    );
}

// A hard link in the data folder could reach a file elsewhere; a Project's own links are the user's.
export function allowLinks(
  { target, shown }: Subject,
  roots: Roots,
  links: number,
): void {
  if (links > 1 && !inProject(target, roots))
    throw new CapabilityRefusal(`${shown} has other hard links`);
}

// A path's real path, or null when it, or a folder on the way, is missing.
export const realOrMissing = (path: string): Promise<string | null> =>
  realpath(path).catch((error: NodeJS.ErrnoException): null => {
    if (missingCodes.has(String(error.code))) return null;

    throw error;
  });

// The real path of the deepest part that exists, plus the rest: parts that don't exist yet hold no symlink.
export async function resolveReal(path: string): Promise<string> {
  const real = await realOrMissing(path);

  if (real !== null) return real;

  if (dirname(path) === path) throw new Error(`${path} does not exist`);

  return join(await resolveReal(dirname(path)), basename(path));
}

/*
 * `*` takes exactly one argument and a trailing `**` the rest; every other pattern is one exact
 * argument. Before a declared `--`, `*` never takes an option, so an argument can't become a flag
 * such as `--output=<file>` that the declaration never named.
 */
export function argsMatch(
  patterns: readonly string[],
  args: readonly string[],
): boolean {
  const open = patterns.at(-1) === '**';
  const fixed = open ? patterns.slice(0, -1) : patterns;
  const operandsFrom = afterOptionsEnd(fixed);

  return (
    countFits(open, fixed.length, args.length) &&
    fixed.every((pattern, index) =>
      argMatches(pattern, args[index], index >= operandsFrom),
    )
  );
}

// The first pattern after a declared `--`, where an argument starting with `-` is no option.
const afterOptionsEnd = (patterns: readonly string[]): number =>
  patterns.includes('--') ? patterns.indexOf('--') + 1 : patterns.length;

const countFits = (open: boolean, fixed: number, given: number): boolean =>
  open ? given >= fixed : given === fixed;

const argMatches = (
  pattern: string,
  arg: string | undefined,
  operand: boolean,
): boolean => (pattern === '*' ? oneArgument(arg, operand) : pattern === arg);

const oneArgument = (arg: string | undefined, operand: boolean): boolean =>
  arg !== undefined && (operand || !arg.startsWith('-'));

// The child's whole environment: the inherited few, plus requested variables its command declares.
export function childEnvironment(
  requested: Record<string, string>,
  matching: readonly ProcessCapability[],
  serverEnvironment: NodeJS.ProcessEnv = process.env,
): Record<string, string> {
  const declared = declaredVariables(matching);

  validateRequestedVariables(requested, declared);

  return Object.assign(
    inherited(serverEnvironment),
    declaredEnvironment(declared, serverEnvironment),
    requested,
  );
}

const declaredVariables = (
  matching: readonly ProcessCapability[],
): Set<string> =>
  new Set(matching.flatMap((capability) => capability.env ?? []));

function validateRequestedVariables(
  requested: Record<string, string>,
  declared: ReadonlySet<string>,
): void {
  for (const name of Object.keys(requested)) allowVariable(name, declared);
}

function declaredEnvironment(
  declared: ReadonlySet<string>,
  serverEnvironment: NodeJS.ProcessEnv,
): Record<string, string> {
  return Object.fromEntries(
    [...declared].flatMap((name) => {
      const value = serverEnvironment[name];

      return value === undefined ? [] : [[name, value]];
    }),
  );
}

function allowVariable(name: string, declared: ReadonlySet<string>): void {
  if (isRefusedVariable(name))
    throw new CapabilityRefusal(`${name} is never allowed`);

  if (!declared.has(name))
    throw new CapabilityRefusal(`${name} is not a declared variable`);
}

const inherited = (
  serverEnvironment: NodeJS.ProcessEnv,
): Record<string, string> =>
  Object.fromEntries(
    inheritedVariables.flatMap((name) => {
      const value = serverEnvironment[name];

      return value === undefined ? [] : [[name, value]];
    }),
  );
