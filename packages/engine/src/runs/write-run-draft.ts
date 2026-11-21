import { randomUUID } from 'node:crypto';
import { constants, type Stats } from 'node:fs';
import {
  link,
  lstat,
  mkdir,
  open,
  rename,
  unlink,
  type FileHandle,
} from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { TRPCError } from '@trpc/server';
import { namesOpenedFile, noFollow, stillAtPath } from './run-checkout-file';
import { runConfigurationsFile } from './run-configurations';

const privateMode = 0o600;

const regularCreationMode = 0o666;

const permissions = 0o777;

const badDraft = (message: string): TRPCError =>
  new TRPCError({ code: 'BAD_REQUEST', message });

// Check the existing file without truncating it and preserve its permissions.
async function replacementMode(path: string): Promise<number | undefined> {
  const existing = await open(path, constants.O_WRONLY | noFollow).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return null;

      if (error.code === 'ELOOP')
        throw badDraft(`${runConfigurationsFile} must not be a symbolic link.`);

      throw error;
    },
  );

  if (!existing) return undefined;
  await using file = existing;
  const info = await file.stat();

  if (!(await stillAtPath(path, info)))
    throw badDraft(`${runConfigurationsFile} changed while it was opened.`);

  if (info.nlink !== 1)
    throw badDraft(`${runConfigurationsFile} must have a single link.`);

  return info.mode & permissions;
}

const createDraft = (staged: string, target: string): Promise<void> =>
  link(staged, target).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'EEXIST') throw error;

    throw new TRPCError({
      code: 'CONFLICT',
      message: `${runConfigurationsFile} already exists. Edit it, or pass overwrite: true to replace it.`,
    });
  });

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

type StagedDraft = { path: string; file: FileHandle; info: Stats };

async function stageAndPublish(draft: DraftPublication): Promise<void> {
  const path = join(dirname(draft.target), `.run.json.${randomUUID()}.tmp`);

  const flags =
    constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | noFollow;

  await using file = await open(path, flags, privateMode);

  const info = await file.stat();

  try {
    await publish(draft, { path, file, info });
  } finally {
    if (await namesOpenedFile(path, info).catch(() => false))
      await unlink(path);
  }
}

async function publish(
  { target, parent, text, overwrite }: DraftPublication,
  { path, file, info }: StagedDraft,
): Promise<void> {
  if (!(await canPublish(path, info, parent)))
    throw badDraft('The .argo directory changed while the draft was opened.');

  await file.writeFile(text);

  const mode = overwrite ? await replacementMode(target) : undefined;
  await file.chmod(mode ?? regularCreationMode & ~process.umask());

  if (!(await canPublish(path, info, parent)))
    throw badDraft(
      'The .argo directory changed before the draft was published.',
    );

  await (overwrite ? rename(path, target) : createDraft(path, target));
}
