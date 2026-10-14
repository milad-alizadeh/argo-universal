import { z } from 'zod';

export type NpmRelease = { name: string; version: string };
// npm's metadata for one published package release.
export type FetchNpmPackage = (
  release: NpmRelease,
  signal: AbortSignal,
) => Promise<unknown>;

const npmRegistry = 'https://registry.npmjs.org';

export async function fetchNpmPackage(
  { name, version }: NpmRelease,
  signal: AbortSignal,
): Promise<unknown> {
  const response = await fetch(
    `${npmRegistry}/${name}/${encodeURIComponent(version)}`,
    { signal },
  );
  if (!response.ok) throw new Error(`npm returned HTTP ${response.status}`);
  return response.json();
}

const NpmPackage = z.object({
  bin: z.union([z.string(), z.record(z.string(), z.string())]),
});
type Bin = z.infer<typeof NpmPackage>['bin'];

// A bare file name, so a PATH lookup never leaves its directory.
const commandPattern = /^\w[\w.-]*$/;
const unscoped = (name: string): string => name.replace(/^@[^/]+\//, '');
const onlyCommand = (commands: readonly string[]): string | undefined =>
  commands.length === 1 ? commands[0] : undefined;
// Of several commands, only the one named like the package, or the only one, is unambiguous.
const namedCommand = (
  commands: readonly string[],
  name: string,
): string | undefined =>
  commands.includes(name) ? name : onlyCommand(commands);
// npm names a string `bin` after the package without its scope.
const commandOf = (bin: Bin, name: string): string | undefined =>
  typeof bin === 'string'
    ? unscoped(name)
    : namedCommand(Object.keys(bin), unscoped(name));
const safeCommand = (command: string | undefined): string | null =>
  command && commandPattern.test(command) ? command : null;

// The command an npm install of this release puts on PATH; null when npm names none unambiguously.
export const readNpmCommand = (
  metadata: unknown,
  name: string,
): string | null => {
  const parsed = NpmPackage.safeParse(metadata);
  return parsed.success ? safeCommand(commandOf(parsed.data.bin, name)) : null;
};
