import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
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

export type DraftedRunConfigurations = {
  path: string;
  configurations: Draft[];
  // The file each Run Configuration came from, by name.
  sources: Record<string, string>;
  skipped: SkippedDraft[];
};

// A name another source already took is numbered; the same command under it is not drafted twice.
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
    `Nothing to draft Run Configurations from: ${runConfigurationsFile} is drafted from package.json scripts, a Procfile, .vscode/launch.json or .claude/launch.json, and none of them starts anything. Write ${runConfigurationsFile} by hand.`,
    ...skipped.map(
      ({ source, name, reason }) => `${source} ${name}: ${reason}`,
    ),
  ].join('\n');

type Merged = Pick<DraftedRunConfigurations, 'configurations' | 'sources'>;

function merge(found: SourceDrafts[]): Merged {
  const merged: Merged = { configurations: [], sources: {} };

  for (const { source, drafts } of found)
    for (const draft of drafts) {
      const repeats = merged.configurations.some(
        ({ command, cwd }) => command === draft.command && cwd === draft.cwd,
      );

      if (repeats) continue;

      const name = uniqueName(draft.name, new Set(Object.keys(merged.sources)));

      merged.configurations.push({ ...draft, name });
      merged.sources[name] = source;
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

async function writeNew(
  checkoutPath: string,
  text: string,
  overwrite: boolean,
): Promise<void> {
  const target = join(checkoutPath, runConfigurationsFile);

  await mkdir(dirname(target), { recursive: true });

  try {
    await writeFile(target, text, { flag: overwrite ? 'w' : 'wx' });
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'EEXIST')
      refuse(
        'CONFLICT',
        `${runConfigurationsFile} already exists. Edit it, or pass overwrite: true to replace it.`,
      );
    throw error;
  }
}

/*
 * Writes a first `.argo/run.json` from what the Checkout already holds. It reads those files and never runs what they name;
 * the file is an ordinary one for a person or an Agent to edit and commit.
 */
export async function draftRunConfigurations(
  checkoutPath: string,
  overwrite: boolean,
): Promise<DraftedRunConfigurations> {
  const found = [
    await draftLaunchFile(checkoutPath, '.claude/launch.json'),
    await draftLaunchFile(checkoutPath, '.vscode/launch.json'),
    await draftPackageScripts(checkoutPath),
    await draftProcfile(checkoutPath),
  ];

  const { configurations, sources } = merge(found);

  const skipped = found.flatMap((one) => one.skipped);

  if (configurations.length === 0)
    return refuse('BAD_REQUEST', nothingFound(skipped));

  await writeNew(checkoutPath, render(configurations), overwrite);

  return { path: runConfigurationsFile, configurations, sources, skipped };
}
