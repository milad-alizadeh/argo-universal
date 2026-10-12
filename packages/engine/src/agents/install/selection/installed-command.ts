import { open } from 'node:fs/promises';
import type { InstallSelection } from './selection';

type InstalledCommand = { executable: string; args: string[] };
const shebangLimit = 256;
const nodeShebang = async (file: string): Promise<boolean> => {
  const handle = await open(file);
  try {
    const header = Buffer.alloc(shebangLimit);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    return /^#!.*\bnode\b/.test(header.subarray(0, bytesRead).toString());
  } finally {
    await handle.close();
  }
};
const usesNode = (file: string): Promise<boolean> =>
  /\.(?:[cm]?js)$/.test(file) ? Promise.resolve(true) : nodeShebang(file);
const npmCommand = async (
  file: string,
  args: string[],
): Promise<InstalledCommand> =>
  (await usesNode(file))
    ? { executable: process.execPath, args: [file, ...args] }
    : { executable: file, args };
export const installedCommand = (
  selection: InstallSelection,
  file: string,
): Promise<InstalledCommand> =>
  selection.kind === 'npx'
    ? npmCommand(file, selection.args)
    : Promise.resolve({ executable: file, args: selection.args });
