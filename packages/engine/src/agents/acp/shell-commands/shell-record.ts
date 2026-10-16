import { mkdir, readdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { jsonCodec } from '../../../lib/json-codec';
import {
  processGroupMembers,
  type ProcessGroupMember,
} from './shell-group-members';
import { releaseShellGroup } from './shell-process-group';
import {
  OwnedProcessRecord,
  writeOwnedProcessRecord,
} from './shell-process-record';

const folderIn = (home: string): string => join(home, 'shell-processes');

const StoredRecord = jsonCodec(OwnedProcessRecord);

export const recordShellGroup = async (
  home: string,
  record: OwnedProcessRecord,
): Promise<string> => {
  await mkdir(folderIn(home), { recursive: true, mode: 0o700 });
  const path = join(folderIn(home), `${record.token}.json`);
  await writeOwnedProcessRecord(path, record);

  return path;
};

export const removeShellRecord = (path: string): Promise<void> =>
  rm(path, { force: true });

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

const requireOwner = (
  members: ProcessGroupMember[],
  record: OwnedProcessRecord,
): void => {
  const owner = members.find((member) => member.pid === record.pid);

  if (!owner?.command.includes(record.token))
    throw new Error('Shell process group identity changed');
};

const releaseRecordedGroup = async (path: string): Promise<void> => {
  const record = StoredRecord.parse(await readFile(path, 'utf8'));
  const members = processGroupMembers(record.pid);

  if (members.length) {
    requireOwner(members, record);
    await releaseShellGroup(record.pid);
  }

  await removeShellRecord(path);
};

export const releaseShellGroups = async (home: string): Promise<void> => {
  for (const name of (await recordNames(home)).filter(isRecord))
    await releaseRecordedGroup(join(folderIn(home), name));
};
