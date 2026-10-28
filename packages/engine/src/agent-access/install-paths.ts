import { lstat } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { z } from 'zod';
import type { InstallInstructionsInput } from './install';

const destinations = [
  '.agents/skills/argo/SKILL.md',
  '.claude/skills/argo/SKILL.md',
  '.codex/rules/argo.rules',
];

export const instructionTargets = (home: string): string[] =>
  destinations.map((path) => join(home, path));

export async function validateTargets(
  input: InstallInstructionsInput,
  targets: string[],
): Promise<void> {
  for (const path of targets) {
    if (input.projectPaths.some((project) => contains(resolve(project), path)))
      throw new Error(
        'Argo instructions cannot be installed inside a Project.',
      );
    await validateAncestors(path, resolve(input.userHome));
  }
}

function contains(parent: string, path: string): boolean {
  const child = relative(parent, path);

  return !isAbsolute(child) && !/^\.\.(?:\/|$)/.test(child);
}

async function validateAncestors(path: string, home: string): Promise<void> {
  for (const current of ancestors(path)) {
    if (contains(home, current)) await validateEntry(current);
    await rejectGitCheckout(current);
  }
}

async function validateEntry(path: string): Promise<void> {
  const entry = await optionalEntry(path);

  if (entry?.isSymbolicLink())
    throw new Error(`Argo instructions cannot follow a symbolic link: ${path}`);
}

async function rejectGitCheckout(path: string): Promise<void> {
  if (await optionalEntry(join(path, '.git')))
    throw new Error(
      'Argo instructions cannot be installed inside a git Checkout.',
    );
}

const absentEntry = z.object({ code: z.enum(['ENOENT', 'ENOTDIR']) });

export async function optionalEntry(
  path: string,
): Promise<Awaited<ReturnType<typeof lstat>> | undefined> {
  try {
    return await lstat(path);
  } catch (error) {
    if (absentEntry.safeParse(error).success) return undefined;
    throw error;
  }
}

function ancestors(path: string): string[] {
  const result = [path];
  let current = path;

  while (dirname(current) !== current) {
    current = dirname(current);
    result.push(current);
  }

  return result;
}
