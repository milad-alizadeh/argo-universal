import { constants } from 'node:fs';
import {
  lstat,
  mkdir,
  open,
  realpath,
  unlink,
  type FileHandle,
} from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { TRPCError } from '@trpc/server';
import { namesOpenedFile, noFollow, stillAtPath } from './run-checkout-file';
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
    `Nothing to draft Run Configurations from: ${runConfigurationsFile} is drafted from package.json scripts, a Procfile, .vscode/launch.json or .claude/launch.json, and none of them starts anything. Write ${runConfigurationsFile} by hand.`,
    ...skipped.map(
      ({ source, name, reason }) => `${source} ${name}: ${reason}`,
    ),
  ].join('\n');

type Merged = Pick<DraftedRunConfigurations, 'configurations' | 'sources'>;

function merge(found: SourceDrafts[]): Merged {
  const merged: Merged = { configurations: [], sources: {} };

  for (const { source, drafts } of found)
    for (const { name, ...draft } of drafts) {
      const repeats = merged.configurations.some(
        ({ name: _name, ...configuration }) =>
          isDeepStrictEqual(configuration, draft),
      );

      if (repeats) continue;

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

type OpenDraft = { file: FileHandle; created: boolean };

async function openDraft(path: string, overwrite: boolean): Promise<OpenDraft> {
  const flags = constants.O_WRONLY | noFollow;

  try {
    const file = await open(path, flags | constants.O_CREAT | constants.O_EXCL);

    return { file, created: true };
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !('code' in error) ||
      error.code !== 'EEXIST'
    )
      throw error;
    if (overwrite) return { file: await open(path, flags), created: false };

    return refuse(
      'CONFLICT',
      `${runConfigurationsFile} already exists. Edit it, or pass overwrite: true to replace it.`,
    );
  }
}

async function checkDraft(
  path: string,
  { file, created }: OpenDraft,
): Promise<void> {
  const info = await file.stat();

  try {
    if (!(await stillAtPath(path, info)))
      refuse(
        'BAD_REQUEST',
        `${runConfigurationsFile} changed while it was opened.`,
      );

    if (info.nlink !== 1)
      refuse(
        'BAD_REQUEST',
        `${runConfigurationsFile} must have a single link.`,
      );
  } catch (error) {
    if (created && (await namesOpenedFile(path, info).catch(() => false)))
      await unlink(path);

    throw error;
  }
}

async function writeNew(
  checkoutPath: string,
  text: string,
  overwrite: boolean,
): Promise<void> {
  const target = join(checkoutPath, runConfigurationsFile);
  const directory = dirname(target);
  await mkdir(directory, { recursive: true });

  if (!(await lstat(directory)).isDirectory())
    refuse('BAD_REQUEST', 'The .argo directory must be inside the Checkout.');

  try {
    const draft = await openDraft(target, overwrite);
    await using file = draft.file;

    await checkDraft(target, draft);
    if (!draft.created) await file.truncate(0);
    await file.writeFile(text);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ELOOP')
      refuse(
        'BAD_REQUEST',
        `${runConfigurationsFile} must not be a symbolic link.`,
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

  await writeNew(checkout, render(configurations), overwrite);

  return { path: runConfigurationsFile, configurations, sources, skipped };
}
