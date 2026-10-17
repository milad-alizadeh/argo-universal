import type { Stats } from 'node:fs';
import { constants } from 'node:fs';
import {
  mkdir,
  readdir,
  realpath,
  stat,
  type FileHandle,
} from 'node:fs/promises';
import { dirname } from 'node:path';
import { CapabilityRefusal } from './capability-refusal';
import type { FileAccess, PluginAccess } from './plugin-access';
import { realOrMissing } from './plugin-access-rules';
import {
  openExisting,
  openFlags,
  openForWrite,
  removeCreated,
  sameNode,
  type OpenFile,
} from './plugin-file-open';
import { argoLimitBytes } from './plugin-limits';
import type { FsCall, PluginValue } from './runtime-protocol';

// A checked path, the access it was checked for, and the checker to ask again once it is open.
type Opening = { access: PluginAccess; path: string; kind: FileAccess };

// An opened file and what `fstat` said about it.
type Opened = { handle: FileHandle; info: Stats; path: string };

export const fileAccessOf = (call: FsCall): FileAccess =>
  call.action === 'write' ? 'write' : 'read';

/*
 * Runs an `argo.fs` call on the path the checker resolved and allowed. The file that was actually
 * opened is checked again, so swapping a path for a symlink after the first check gains nothing.
 */
export async function fsCall(
  access: PluginAccess,
  call: FsCall,
  path: string,
): Promise<PluginValue> {
  const opening = { access, kind: fileAccessOf(call), path };

  if (call.action === 'write') return write(opening, call.content);

  const file = await openExisting(path, openFlags | constants.O_RDONLY);

  return checked(opening, file, (opened) => inspect(call.action, opened));
}

// Only a write may create a file; it truncates after the check, so a refused write changes nothing.
async function write(opening: Opening, content: string): Promise<null> {
  if (Buffer.byteLength(content) > argoLimitBytes)
    throw new Error(`Content is over the ${argoLimitBytes} byte write limit`);
  await opening.access.makeDataFolder();
  await makeParents(opening, dirname(opening.path));

  const file = await openForWrite(opening.path);

  return checked(opening, file, async ({ handle }) => {
    await handle.truncate(0);
    await handle.writeFile(content);

    return null;
  });
}

/*
 * Creates missing parent folders one at a time, checking each folder it creates in before and
 * after, so a folder swapped for a symlink stops the write instead of growing folders elsewhere.
 */
async function makeParents(opening: Opening, folder: string): Promise<void> {
  if (await existingFolder(opening, folder)) return;

  await makeParents(opening, dirname(folder));
  await mkdir(folder).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'EEXIST') throw error;
  });
  await existingFolder(opening, folder);
}

// True when the folder exists where it was checked to be; refused when it now resolves elsewhere.
async function existingFolder(
  { access }: Opening,
  folder: string,
): Promise<boolean> {
  const real = await realOrMissing(folder);

  if (real === null) return false;

  if (real !== folder)
    throw new CapabilityRefusal(`${folder} changed while it was created`);

  await access.allowPath({ target: real, shown: real }, 'write', 1);

  return true;
}

// Runs on the opened file once it is checked again; a refused file this call created is removed.
async function checked<T>(
  opening: Opening,
  file: OpenFile,
  run: (opened: Opened) => Promise<T>,
): Promise<T> {
  try {
    const info = await file.handle.stat();

    await recheck(opening, file, info);

    return await run({ handle: file.handle, info, path: opening.path });
  } finally {
    await file.handle.close();
  }
}

async function recheck(
  opening: Opening,
  file: OpenFile,
  info: Stats,
): Promise<void> {
  try {
    await sameFile(opening, info);
  } catch (error) {
    if (file.created) await removeCreated(opening.path, file.handle);

    throw error;
  }
}

// The opened file must still be the one at the checked path, and that path must still be allowed.
async function sameFile(
  { access, path, kind }: Opening,
  info: Stats,
): Promise<void> {
  const now = await realpath(path);

  if (now !== path || !sameNode(await stat(now), info))
    throw new CapabilityRefusal(`${path} changed while it was opened`);

  await access.allowPath({ target: now, shown: now }, kind, linksOf(info));
}

// A folder's link count is its entries; only a file's says whether another name reaches it.
const linksOf = (info: Stats): number => (info.isFile() ? info.nlink : 1);

function inspect(
  action: Exclude<FsCall['action'], 'write'>,
  file: Opened,
): Promise<PluginValue> {
  if (action === 'read') return readCapped(file);

  if (action === 'list') return list(file);

  return Promise.resolve(describeFile(file.info));
}

const describeFile = (info: Stats): PluginValue => ({
  kind: info.isDirectory() ? 'directory' : 'file',
  size: info.size,
  modified: info.mtimeMs,
});

// Reads at most one byte past the cap, so a file that grows or reports no size cannot slip over it.
async function readCapped({ handle, info, path }: Opened): Promise<string> {
  if (!info.isFile()) throw new Error(`${path} is not a file`);

  const buffer = Buffer.alloc(argoLimitBytes + 1);
  const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);

  if (bytesRead > argoLimitBytes)
    throw new Error(`File is over the ${argoLimitBytes} byte read limit`);

  return buffer.toString('utf8', 0, bytesRead);
}

// The listing is read by path, so the folder is checked to be the opened one afterwards as well.
async function list({ info, path }: Opened): Promise<PluginValue> {
  if (!info.isDirectory()) throw new Error(`${path} is not a folder`);

  const entries = await readdir(path, { withFileTypes: true });

  if (!sameNode(await stat(path), info))
    throw new CapabilityRefusal(`${path} changed while it was listed`);

  return entries.map((entry) => ({
    name: entry.name,
    kind: entry.isDirectory() ? 'directory' : 'file',
  }));
}
