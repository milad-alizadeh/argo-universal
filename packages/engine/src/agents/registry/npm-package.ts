import { z } from 'zod';

export type NpmRelease = { name: string; version: string };

const npmRegistry = 'https://registry.npmjs.org';

// npm's metadata for one published package release.
export async function fetchNpmPackage(
  { name, version }: NpmRelease,
  signal: AbortSignal,
): Promise<string> {
  const response = await fetch(
    `${npmRegistry}/${name}/${encodeURIComponent(version)}`,
    { signal },
  );

  if (!response.ok) throw new Error(`npm returned HTTP ${response.status}`);

  return response.text();
}

const NpmPackage = z.object({
  bin: z.union([z.string(), z.record(z.string(), z.string())]),
});

type Bin = z.infer<typeof NpmPackage>['bin'];

// A bare file name, so a PATH lookup never leaves its directory.
const commandPattern = /^\w[\w.-]*$/;

const unscoped = (name: string): string => name.replace(/^@[^/]+\//, '');

const onlyTarget = (targets: readonly string[]): string | undefined => {
  const distinct = new Set(targets);

  return distinct.size === 1 ? targets[0] : undefined;
};

// The command's file: the one named like the package, or the only file; several files are ambiguous.
const commandFile = (
  bin: Record<string, string>,
  name: string,
): string | undefined => bin[name] ?? onlyTarget(Object.values(bin));

// Every bin name for one file is an alias of the same command.
const aliasesOf = (bin: Record<string, string>, name: string): string[] => {
  const file = commandFile(bin, name);

  return Object.keys(bin).filter((command) => bin[command] === file);
};

// npm names a string `bin` after the package without its scope.
const commandsOf = (bin: Bin, name: string): string[] =>
  typeof bin === 'string' ? [unscoped(name)] : aliasesOf(bin, unscoped(name));

// The `bin` of npm's metadata text; none when the text is not npm metadata.
const binOf = (text: string): Bin | undefined => {
  try {
    const parsed = NpmPackage.safeParse(JSON.parse(text));

    return parsed.success ? parsed.data.bin : undefined;
  } catch {
    return undefined;
  }
};

// The names an npm install of this release puts on PATH for its command, read from npm's metadata text; empty when npm names none unambiguously.
export const readNpmCommands = (
  metadataText: string,
  name: string,
): string[] => {
  const bin = binOf(metadataText);
  const commands = bin === undefined ? [] : commandsOf(bin, name);

  return commands.filter((command) => commandPattern.test(command));
};
