import { readFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { createRejectionCounter } from '@repo/machine-log';
import { cleanInstallProcess, InstallCleanupError } from './process-cleanup';
import { installerGroupMembers } from './process-group';
import { InstallerGroupRecord, installerRecordPath } from './process-record';
const rejections = createRejectionCounter('Installer ownership records');
const missingFile = (error: unknown): boolean =>
  error instanceof Error && 'code' in error && error.code === 'ENOENT';
const readRecord = async (
  path: string,
): Promise<InstallerGroupRecord | undefined> => {
  try {
    return InstallerGroupRecord.parse(JSON.parse(await readFile(path, 'utf8')));
  } catch (error) {
    if (missingFile(error)) return undefined;
    rejections.report('Installer ownership record cannot be read');
    throw new InstallCleanupError('Installer ownership record cannot be read', {
      cause: error,
    });
  }
};
const matchesRecordedLeader = (record: InstallerGroupRecord): boolean =>
  installerGroupMembers(record.pid).some(
    (member) =>
      member.pid === record.pid && member.command.includes(record.token),
  );
const releaseRecordedGroup = async (
  record: InstallerGroupRecord,
): Promise<void> => {
  const members = installerGroupMembers(record.pid);
  if (members.length === 0) return;
  if (!matchesRecordedLeader(record))
    throw new InstallCleanupError('Installer process group identity changed');
  await cleanInstallProcess({ pid: record.pid });
};
const releaseStagingGroup = async (directory: string): Promise<void> => {
  const path = installerRecordPath(directory);
  const record = await readRecord(path);
  if (!record) return;
  await releaseRecordedGroup(record);
  await rm(path, { force: true });
};
const childDirectories = async (path: string): Promise<string[]> => {
  try {
    return (await readdir(path, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(path, entry.name));
  } catch (error) {
    if (missingFile(error)) return [];
    throw error;
  }
};
const releaseScopeGroups = async (scope: string): Promise<void> => {
  for (const directory of await childDirectories(scope))
    await releaseStagingGroup(directory);
};
export const releaseInstallationProcessGroups = async (
  home: string,
): Promise<void> => {
  for (const scope of await childDirectories(join(home, 'agents')))
    await releaseScopeGroups(scope);
};
