import { mkdir, readFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { createRejectionCounter } from '@repo/machine-log';
import {
  OwnedProcessRecord,
  writeOwnedProcessRecord,
} from '../../lib/owned-process-record';
import { processGroupMembers } from '../../lib/process-group-members';
import { removeTerminalChannelPath } from './terminal-channel-path';
import {
  releaseTerminalGroup,
  observeTerminalRelease,
} from './terminal-process-group';

const rejections = createRejectionCounter('Terminal ownership records');

const folderName = 'login-terminals';

const ownerOnlyMode = 0o700;

export const terminalRecordPath = (home: string, token: string): string =>
  join(home, folderName, `${token}.json`);

const missing = (cause: unknown): boolean =>
  cause instanceof Error && 'code' in cause && cause.code === 'ENOENT';

export const recordTerminalGroup = async (
  home: string,
  record: OwnedProcessRecord,
): Promise<string> => {
  const folder = join(home, folderName);
  await mkdir(folder, { recursive: true, mode: ownerOnlyMode });
  const path = terminalRecordPath(home, record.token);
  await writeOwnedProcessRecord(path, record);

  return path;
};

export const removeTerminalRecord = async (path: string): Promise<void> => {
  await rm(path, { force: true });
  await rm(`${path}.pending`, { force: true });
};

const readRecord = async (
  path: string,
): Promise<OwnedProcessRecord | undefined> => {
  try {
    return OwnedProcessRecord.parse(JSON.parse(await readFile(path, 'utf8')));
  } catch (error) {
    if (missing(error)) return;
    rejections.report('Terminal ownership record cannot be read');
    throw new Error('Terminal ownership record cannot be read', {
      cause: error,
    });
  }
};

const releaseRecordedGroup = async (
  record: OwnedProcessRecord,
): Promise<void> => {
  const members = processGroupMembers(record.pid);

  if (!members.length) return;

  if (
    members.some(
      (member) =>
        member.pid === record.pid && member.command.includes(record.token),
    )
  )
    return releaseTerminalGroup(record.pid);
  await requireReleasedGroup(record.pid);
};

const requireReleasedGroup = async (pid: number): Promise<void> => {
  if (!(await observeTerminalRelease(pid)))
    throw new Error('Terminal process group identity changed');
};

const records = async (folder: string): Promise<string[]> => {
  try {
    return (await readdir(folder))
      .filter(isRecordName)
      .map((name) => join(folder, name));
  } catch (error) {
    if (missing(error)) return [];
    throw error;
  }
};

const isRecordName = (name: string): boolean =>
  name.endsWith('.json') || name.endsWith('.json.pending');

export const releaseLoginTerminalGroups = async (
  home: string,
): Promise<void> => {
  for (const path of await records(join(home, folderName))) {
    const record = await readRecord(path);

    if (!record) continue;
    await releaseRecordedGroup(record);
    await removeTerminalChannelPath(record.token);
    await rm(path, { force: true });
  }
};
