import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import {
  OwnedProcessRecord,
  writeOwnedProcessRecord,
} from '../../../lib/owned-process-record';

export { OwnedProcessRecord as InstallerGroupRecord } from '../../../lib/owned-process-record';

const installerRecordName = '.installer-group.json';

export const isInstallerRecordName = (name: string | undefined): boolean =>
  name === installerRecordName || name === `${installerRecordName}.pending`;

export const installerRecordPath = (directory: string): string =>
  join(directory, installerRecordName);

export const recordInstallerGroup = (
  directory: string,
  record: OwnedProcessRecord,
): Promise<void> =>
  writeOwnedProcessRecord(installerRecordPath(directory), record);

export const removeInstallerRecord = (directory: string): Promise<void> =>
  rm(installerRecordPath(directory), { force: true });
