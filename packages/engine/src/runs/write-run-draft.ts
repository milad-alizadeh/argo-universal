import { randomUUID } from 'node:crypto';
import { constants, type Stats } from 'node:fs';
import { link, lstat, mkdir, open, rename, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { TRPCError } from '@trpc/server';
import { namesOpenedFile, noFollow, stillAtPath } from './run-checkout-file';
import { runConfigurationsFile } from './run-configurations';

const privateMode = 0o600;
const regularCreationMode = 0o666;
const permissions = 0o777;

const codeOf = (error: unknown): unknown =>
  error instanceof Error && 'code' in error ? error.code : undefined;

const badDraft = (message: string): TRPCError =>
  new TRPCError({ code: 'BAD_REQUEST', message });

function linkedDraft(): TRPCError {
  return badDraft(`${runConfigurationsFile} must not be a symbolic link.`);
}

// Check the existing file without truncating it and preserve its permissions.
async function replacementMode(path: string): Promise<number | undefined> {
  try {
    await using file = await open(path, constants.O_WRONLY | noFollow);
    const info = await file.stat();

    if (!(await stillAtPath(path, info)))
      throw badDraft(`${runConfigurationsFile} changed while it was opened.`);
    if (info.nlink !== 1)
      throw badDraft(`${runConfigurationsFile} must have a single link.`);

    return info.mode & permissions;
  } catch (error) {
    if (codeOf(error) === 'ENOENT') return undefined;
    if (codeOf(error) === 'ELOOP') throw linkedDraft();

    throw error;
  }
}

async function createDraft(staged: string, target: string): Promise<void> {
  try {
    await link(staged, target);
  } catch (error) {
    if (codeOf(error) !== 'EEXIST') throw error;

    throw new TRPCError({
      code: 'CONFLICT',
      message: `${runConfigurationsFile} already exists. Edit it, or pass overwrite: true to replace it.`,
    });
  }
}

const canPublish = async (
  staged: string,
  info: Stats,
  directory: Stats,
): Promise<boolean> =>
  (await stillAtPath(staged, info)) &&
  (await namesOpenedFile(dirname(staged), directory));

// Publish the complete file with one filesystem operation. A hard link keeps creation exclusive.
export async function writeRunDraft(
  checkout: string,
  text: string,
  overwrite: boolean,
): Promise<void> {
  const target = join(checkout, runConfigurationsFile);
  const directory = dirname(target);
  await mkdir(directory, { recursive: true });

  const parent = await lstat(directory);

  if (!parent.isDirectory())
    throw badDraft('The .argo directory must be inside the Checkout.');

  await stageAndPublish({ target, parent, text, overwrite });
}

type DraftPublication = {
  target: string;
  parent: Stats;
  text: string;
  overwrite: boolean;
};

async function stageAndPublish({
  target,
  parent,
  text,
  overwrite,
}: DraftPublication): Promise<void> {
  const staged = join(dirname(target), `.run.json.${randomUUID()}.tmp`);
  const flags =
    constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | noFollow;
  await using file = await open(staged, flags, privateMode);
  const info = await file.stat();

  try {
    if (!(await canPublish(staged, info, parent)))
      throw badDraft('The .argo directory changed while the draft was opened.');

    await file.writeFile(text);
    const mode = overwrite ? await replacementMode(target) : undefined;
    await file.chmod(mode ?? regularCreationMode & ~process.umask());

    if (!(await canPublish(staged, info, parent)))
      throw badDraft(
        'The .argo directory changed before the draft was published.',
      );

    await (overwrite ? rename(staged, target) : createDraft(staged, target));
  } finally {
    if (await namesOpenedFile(staged, info).catch(() => false))
      await unlink(staged);
  }
}
