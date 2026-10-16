import { open } from 'node:fs/promises';
import { rename } from 'node:fs/promises';
import { dirname } from 'node:path';
import { z } from 'zod';

const ownerOnlyMode = 0o600;

export const ShellProcessRecord = z.strictObject({
  pid: z.number().int().positive(),
  token: z.string().uuid(),
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
