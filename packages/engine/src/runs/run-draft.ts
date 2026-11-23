import { realpath } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { TRPCError } from '@trpc/server';
import {
  readRunConfigurations,
  runConfigurationsFile,
} from './run-configurations';
import {
  draftLaunchFile,
  draftPackageScripts,
  draftProcfile,
  type Draft,
  type SkippedDraft,
  type SourceDrafts,
} from './run-draft-sources';
import { writeRunDraft } from './write-run-draft';

export type DraftedRunConfigurations = {
  path: string;
  configurations: Draft[];
  // The file each Run Configuration came from, by name.
  sources: Record<string, string>;
  skipped: SkippedDraft[];
};

// A name another source already took is numbered.
function uniqueName(name: string, taken: ReadonlySet<string>): string {
  if (!taken.has(name)) return name;

  let number = 2;

  while (taken.has(`${name}-${number}`)) number += 1;

  return `${name}-${number}`;
}

const refuse = (code: 'BAD_REQUEST' | 'CONFLICT', message: string): never => {
  throw new TRPCError({ code, message });
};

const nothingFound = (skipped: SkippedDraft[]): string =>
  [
    'No sources in Checkout.',
    `Use the template from run.guide to write ${runConfigurationsFile}, or ask an Agent to do it.`,
    'Argo looked for package.json scripts, a Procfile, .vscode/launch.json and .claude/launch.json.',
    ...skipped.map(
      ({ source, name, reason }) => `${source} ${name}: ${reason}`,
    ),
  ].join('\n');

// `pnpm dev` and `pnpm run dev` run the same script; npm needs its `run`.
const scriptCommand = (command: string): string =>
  command.replace(/^(?<manager>pnpm|yarn|bun) run /u, '$<manager> ');

const sameOrUnset = <Value>(
  later: Value | undefined,
  earlier: Value | undefined,
): boolean => later === undefined || isDeepStrictEqual(later, earlier);

const repeats = (earlier: Draft, later: Omit<Draft, 'name'>): boolean =>
  scriptCommand(earlier.command) === scriptCommand(later.command) &&
  earlier.cwd === later.cwd &&
  isDeepStrictEqual(earlier.env, later.env) &&
  sameOrUnset(later.port, earlier.port) &&
  sameOrUnset(later.ready, earlier.ready);

type Merged = Pick<DraftedRunConfigurations, 'configurations' | 'sources'>;

function merge(found: SourceDrafts[]): Merged {
  const merged: Merged = { configurations: [], sources: {} };

  for (const { source, drafts } of found)
    for (const { name, ...draft } of drafts) {
      if (merged.configurations.some((earlier) => repeats(earlier, draft)))
        continue;

      const draftedName = uniqueName(
        name,
        new Set(Object.keys(merged.sources)),
      );

      merged.configurations.push({ name: draftedName, ...draft });
      merged.sources[draftedName] = source;
    }

  return merged;
}

// A draft the reader would refuse is a bug here, never a file for the person to find out about.
function render(configurations: Draft[]): string {
  const text = `${JSON.stringify({ configurations }, null, 2)}\n`;

  const read = readRunConfigurations(text);

  if (!read.ok)
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `The drafted Run Configurations are not valid: ${read.error.message}`,
    });

  return text;
}

/*
 * Writes a first `.argo/run.json` from what the Checkout already holds. It reads those files and never runs what they name;
 * the file is an ordinary one for a person or an Agent to edit and commit.
 */
export async function draftRunConfigurations(
  checkoutPath: string,
  overwrite: boolean,
): Promise<DraftedRunConfigurations> {
  const checkout = await realpath(checkoutPath);

  const found = [
    await draftLaunchFile(checkout, '.claude/launch.json'),
    await draftLaunchFile(checkout, '.vscode/launch.json'),
    await draftPackageScripts(checkout),
    await draftProcfile(checkout),
  ];

  const { configurations, sources } = merge(found);

  const skipped = found.flatMap((one) => one.skipped);

  if (configurations.length === 0)
    return refuse('BAD_REQUEST', nothingFound(skipped));

  await writeRunDraft(checkout, render(configurations), overwrite);

  return { path: runConfigurationsFile, configurations, sources, skipped };
}
