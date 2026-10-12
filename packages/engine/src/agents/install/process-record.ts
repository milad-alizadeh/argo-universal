import { open, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
const ownerOnlyMode = 0o600;
const installerRecordName = '.installer-group.json';
export const isInstallerRecordName = (name: string | undefined): boolean =>
  name === installerRecordName || name === `${installerRecordName}.pending`;
export const InstallerGroupRecord = z.strictObject({
  pid: z.number().int().positive(),
  token: z.string().uuid(),
});
export type InstallerGroupRecord = z.infer<typeof InstallerGroupRecord>;
export const installerRecordPath = (directory: string): string =>
  join(directory, installerRecordName);
const syncDirectory = async (directory: string): Promise<void> => {
  const file = await open(directory, 'r');
  try {
    await file.sync();
  } finally {
    await file.close();
  }
};
export const recordInstallerGroup = async (
  directory: string,
  record: InstallerGroupRecord,
): Promise<void> => {
  const path = installerRecordPath(directory);
  const file = await open(`${path}.pending`, 'wx', ownerOnlyMode);
  try {
    await file.writeFile(JSON.stringify(record));
    await file.sync();
  } finally {
    await file.close();
  }
  await rename(`${path}.pending`, path);
  await syncDirectory(directory);
};
export const removeInstallerRecord = (directory: string): Promise<void> =>
  rm(installerRecordPath(directory), { force: true });
