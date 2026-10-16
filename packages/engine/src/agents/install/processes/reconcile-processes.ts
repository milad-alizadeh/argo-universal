import { readFile, readdir, rm } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { createRejectionCounter } from '@repo/machine-log';
import { jsonCodec } from '../../../lib/json-codec';
import { cleanInstallProcess, InstallCleanupError } from './process-cleanup';
import { installerGroupMembers } from './process-group';
import { InstallerGroupRecord, installerRecordPath } from './process-record';

const rejections = createRejectionCounter('Installer ownership records');

const StoredRecord = jsonCodec(InstallerGroupRecord);

const missingFile = (cause: unknown): boolean =>
  cause instanceof Error && 'code' in cause && cause.code === 'ENOENT';

const readRecord = async (
  path: string,
): Promise<InstallerGroupRecord | undefined> => {
  try {
    return StoredRecord.parse(await readFile(path, 'utf8'));
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

const stagingDirectories = async (registry: string): Promise<string[]> =>
  (
    await Promise.all(
      (await childDirectories(registry)).map(async (scope) =>
        (await childDirectories(scope)).filter((directory) =>
          basename(directory).startsWith('.staging-'),
        ),
      ),
    )
  ).flat();

const registryOperationDirectories = async (
  registry: string,
): Promise<string[]> => [
  ...(await childDirectories(join(registry, 'npx'))),
  ...(await childDirectories(join(registry, '.probes'))),
  ...(await stagingDirectories(registry)),
];

export const releaseInstallationProcessGroups = async (
  home: string,
): Promise<void> => {
  const agents = join(home, 'agents');

  for (const scope of await childDirectories(agents))
    await releaseScopeGroups(scope);

  for (const directory of await registryOperationDirectories(
    join(agents, 'registry'),
  ))
    await releaseStagingGroup(directory);
};
