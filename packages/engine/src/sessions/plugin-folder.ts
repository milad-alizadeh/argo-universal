import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { TRPCError } from '@trpc/server';

const taken = (shown: string): TRPCError =>
  new TRPCError({
    code: 'CONFLICT',
    message: `${shown} already exists. Pick another id, or edit that Plugin; plugin.new never overwrites.`,
  });

const isExisting = (cause: unknown): boolean =>
  cause instanceof Error && 'code' in cause && cause.code === 'EEXIST';

// Making the folder is the claim: only one caller can make it, so no Plugin is ever written over.
async function claim(directory: string, shown: string): Promise<void> {
  await mkdir(dirname(directory), { recursive: true });
  await mkdir(directory).catch((cause: unknown) => {
    throw isExisting(cause) ? taken(shown) : cause;
  });
}

async function writeAll(
  directory: string,
  files: [string, string][],
): Promise<void> {
  for (const [file, content] of files) {
    await mkdir(dirname(join(directory, file)), { recursive: true });
    await writeFile(join(directory, file), content, { flag: 'wx' });
  }
}

// A new folder holding every file, or no folder: a write that fails removes the folder this call made.
export async function writePluginFolder(
  directory: string,
  shown: string,
  files: [string, string][],
): Promise<void> {
  await claim(directory, shown);

  try {
    await writeAll(directory, files);
  } catch (cause) {
    await rm(directory, { recursive: true, force: true });
    throw cause;
  }
}

const workspaceFolders = ['packages', 'plugins', join('plugins', 'examples')];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

// A parsed `package.json` that holds a string `name`.
const isNamed = (manifest: unknown): manifest is { name: string } =>
  isRecord(manifest) && typeof manifest.name === 'string';

const packageName = (manifest: unknown): string[] =>
  isNamed(manifest) ? [manifest.name] : [];

const nameIn = (folder: string): Promise<string[]> =>
  readFile(join(folder, 'package.json'), 'utf8').then(
    (text: string) => packageName(JSON.parse(text)),
    (): string[] => [],
  );

const children = (folder: string): Promise<string[]> =>
  readdir(folder).then(
    (names) => names.map((name) => join(folder, name)),
    (): string[] => [],
  );

// The package names the Checkout's workspace folders hold, bar the folder `except`, which a new Plugin's package may not repeat.
export async function workspacePackageNames(
  checkout: string,
  except: string,
): Promise<string[]> {
  const folders = await Promise.all(
    workspaceFolders.map((folder) => children(join(checkout, folder))),
  );

  const kept = folders
    .flat()
    .filter((folder) => folder !== join(checkout, except));

  const names = await Promise.all(kept.map(nameIn));

  return names.flat();
}
