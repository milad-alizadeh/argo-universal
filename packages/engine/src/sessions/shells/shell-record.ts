import { mkdir, readdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { writeLog } from '@repo/machine-log';
import { z } from 'zod';
import { jsonCodec } from '../../lib/json-codec';
import { hasGroupOwner, hasLiveGroupMembers } from './shell-group-members';
import { releaseShellGroup } from './shell-process-group';
import {
  ShellProcessRecord,
  writeShellProcessRecord,
} from './shell-process-record';

const folderIn = (home: string): string => join(home, 'shell-processes');

const StoredRecord = jsonCodec(ShellProcessRecord);

export const recordShellGroup = async (
  home: string,
  record: ShellProcessRecord,
): Promise<string> => {
  await mkdir(folderIn(home), { recursive: true, mode: 0o700 });
  const path = join(folderIn(home), `${record.token}.json`);
  await writeShellProcessRecord(path, record);

  return path;
};

export const removeShellRecord = (path: string): Promise<void> =>
  rm(path, { force: true });

export const recordCheckoutTerminalOwner = async (
  home: string,
  pid: number,
  token: string,
): Promise<() => Promise<void>> => {
  const path = await recordShellGroup(home, {
    pid,
    token,
    checkoutTerminal: true,
  });

  return () => removeShellRecord(path);
};

const Missing = z.object({ code: z.literal('ENOENT') });

const recordNames = async (home: string): Promise<string[]> => {
  try {
    return await readdir(folderIn(home));
  } catch (error) {
    if (Missing.safeParse(error).success) return [];
    throw error;
  }
};

const isRecord = (name: string): boolean =>
  name.endsWith('.json') || name.endsWith('.json.pending');

const releaseRecordedGroup = async (
  home: string,
  path: string,
): Promise<void> => {
  const record = StoredRecord.parse(await readFile(path, 'utf8'));

  if (hasLiveGroupMembers(record.pid)) {
    if (!hasGroupOwner(record.pid, record.token))
      throw new Error('Shell process group identity changed');
    await releaseShellGroup(record.pid);
  }

  if (record.checkoutTerminal)
    writeLog({
      home,
      label: 'engine',
      line: `Shell Terminal ${record.token} marked lost after Engine exit`,
    });
  await removeShellRecord(path);
};

export const releaseShellGroups = async (home: string): Promise<void> => {
  for (const name of (await recordNames(home)).filter(isRecord))
    await releaseRecordedGroup(home, join(folderIn(home), name));
};
