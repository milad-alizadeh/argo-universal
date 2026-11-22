import { mkdir, open, readdir, readFile, rename, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { z } from 'zod';
import { jsonCodec } from './json-codec';

const ownerOnlyMode = 0o600;

export const ShellProcessRecord = z.strictObject({
  pid: z.number().int().positive(),
  token: z.string().uuid(),
  checkoutTerminal: z.literal(true).optional(),
});

export type ShellProcessRecord = z.infer<typeof ShellProcessRecord>;

const syncDirectory = async (directory: string): Promise<void> => {
  const file = await open(directory, 'r');

  try {
    await file.sync();
  } finally {
    await file.close();
  }
};

export const writeShellProcessRecord = async (
  path: string,
  record: ShellProcessRecord,
): Promise<void> => {
  const file = await open(`${path}.pending`, 'wx', ownerOnlyMode);

  try {
    await file.writeFile(JSON.stringify(record));
    await file.sync();
  } finally {
    await file.close();
  }

  await rename(`${path}.pending`, path);
  await syncDirectory(dirname(path));
};

// Background Tasks and checkout Terminals share the stored format, including records from older Servers.
const folderIn = (home: string): string => join(home, 'shell-processes');
const StoredRecord = jsonCodec(ShellProcessRecord);
const Missing = z.object({ code: z.literal('ENOENT') });

export async function recordTerminalOwner(
  home: string,
  record: ShellProcessRecord,
): Promise<string> {
  const folder = folderIn(home);
  await mkdir(folder, { recursive: true, mode: 0o700 });
  const path = join(folder, `${record.token}.json`);
  await writeShellProcessRecord(path, record);

  return path;
}

export const forgetTerminalOwner = (path: string): Promise<void> =>
  rm(path, { force: true });

async function recordNames(folder: string): Promise<string[]> {
  try {
    return await readdir(folder);
  } catch (error) {
    if (Missing.safeParse(error).success) return [];
    throw error;
  }
}

type StoredOwner = { path: string; record: ShellProcessRecord };

export async function* terminalOwners(
  home: string,
): AsyncGenerator<StoredOwner> {
  const folder = folderIn(home);

  for (const name of await recordNames(folder)) {
    if (!name.endsWith('.json') && !name.endsWith('.json.pending')) continue;
    const path = join(folder, name);
    const record = StoredRecord.parse(await readFile(path, 'utf8'));

    yield { path, record };
  }
}
