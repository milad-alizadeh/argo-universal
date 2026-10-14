import type { ACPAgent } from '@repo/contracts';
import type { Database } from '@repo/db';
import { agents } from '@repo/db/schema';
import { isNotNull } from 'drizzle-orm';
import { resolveInstallRecipe } from '../install/materialization/recipe';
import {
  type FetchNpmPackage,
  type NpmRelease,
  readNpmCommand,
} from './npm-package';
import { createRegistryReader } from './registry-reader';

// One slow package must not hold up the catalog.
const npmTimeoutMs = 5_000;
const reader = createRegistryReader();

const releaseOf = (
  entry: ACPAgent,
  recipe: NonNullable<ACPAgent['distribution']['npx']>,
): NpmRelease | undefined => {
  const release = resolveInstallRecipe(entry, { kind: 'npx', recipe });
  return release.kind === 'npx'
    ? { name: release.name, version: release.version }
    : undefined;
};
// The exact npm release behind an npx entry; none when it has no npx package or a malformed one.
const npxRelease = (entry: ACPAgent): NpmRelease | undefined => {
  const recipe = entry.distribution.npx;
  try {
    return recipe && releaseOf(entry, recipe);
  } catch {
    return undefined;
  }
};
const savedRelease = (metadata: string | null): NpmRelease | undefined => {
  try {
    return npxRelease(reader.parseAgent(metadata));
  } catch {
    return undefined;
  }
};
const releaseKey = ({ name, version }: NpmRelease): string =>
  `${name}@${version}`;

// The command names already read, by the npm release they were read for.
const savedCommandNames = (database: Database): Map<string, string> => {
  const saved = new Map<string, string>();
  const rows = database
    .select({ metadata: agents.registryMetadata, command: agents.commandName })
    .from(agents)
    .where(isNotNull(agents.commandName))
    .all();
  for (const row of rows) remember(saved, row);
  return saved;
};
const remember = (
  saved: Map<string, string>,
  { metadata, command }: { metadata: string | null; command: string | null },
): void => {
  const release = savedRelease(metadata);
  if (release && command) saved.set(releaseKey(release), command);
};

type CommandNameInput = {
  database: Database;
  fetchNpmPackage: FetchNpmPackage;
  signal: AbortSignal;
};
const fetchCommand = async (
  input: CommandNameInput,
  release: NpmRelease,
): Promise<string | null> => {
  const signal = AbortSignal.any([
    input.signal,
    AbortSignal.timeout(npmTimeoutMs),
  ]);
  const metadata = await input.fetchNpmPackage(release, signal);
  return readNpmCommand(metadata, release.name);
};
const commandFor = async (
  input: CommandNameInput & { saved: Map<string, string> },
  release: NpmRelease | undefined,
): Promise<string | null> => {
  if (!release) return null;
  return (
    input.saved.get(releaseKey(release)) ??
    fetchCommand(input, release).catch(() => null)
  );
};

// Each npx entry's command name, by Registry id: npm is asked once per release; missing or ambiguous metadata is null and never fails the sync.
export async function readNpxCommandNames(
  input: CommandNameInput,
  entries: readonly ACPAgent[],
): Promise<Map<string, string | null>> {
  const lookup = { ...input, saved: savedCommandNames(input.database) };
  const named = await Promise.all(
    entries.map(
      async (entry) =>
        [entry.id, await commandFor(lookup, npxRelease(entry))] as const,
    ),
  );
  return new Map(named);
}
