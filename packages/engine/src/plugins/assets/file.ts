import type { Stats } from 'node:fs';
import { realpath, stat, type FileHandle } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import { CapabilityRefusal } from '../access/capability-refusal';
import { inside } from '../access/plugin-access-rules';
import {
  openExisting,
  openFlags,
  sameNode,
} from '../services/plugin-file-open';
import { assetBytes, assetFormat, type AssetContent } from './content';

type AssetFile = { codeFolder: string; path: string; asset: string };

export async function readAssetFile(
  codeFolder: string,
  asset: string,
): Promise<AssetContent> {
  const path = await assetFilePath(codeFolder, asset);
  const { handle } = await openExisting(path, openFlags);

  try {
    await checkOpenedAsset(handle, { codeFolder, path, asset });

    return await readOpenedAsset(handle, asset);
  } finally {
    await handle.close();
  }
}

async function readOpenedAsset(
  file: FileHandle,
  asset: string,
): Promise<AssetContent> {
  return {
    format: assetFormat(asset),
    bytes: await assetBytes(file.createReadStream({ autoClose: false })),
  };
}

async function assetFilePath(
  codeFolder: string,
  asset: string,
): Promise<string> {
  if (isAbsolute(asset))
    throw new CapabilityRefusal('Assets must name a relative Plugin file');

  const [root, path] = await Promise.all([
    realpath(codeFolder),
    realpath(resolve(codeFolder, asset)),
  ]);

  if (!inside(path, root))
    throw new CapabilityRefusal('Assets must stay in the Plugin folder');

  return path;
}

async function checkOpenedAsset(
  file: FileHandle,
  { codeFolder, path, asset }: AssetFile,
): Promise<void> {
  const info = await file.stat();
  requireRegularAsset(info);
  const current = await assetFilePath(codeFolder, asset);

  if (current !== path || !sameNode(info, await stat(current)))
    throw new CapabilityRefusal('Asset changed while it was opened');
}

function requireRegularAsset(info: Stats): void {
  if (!info.isFile() || info.nlink !== 1)
    throw new CapabilityRefusal('Asset must be a regular file with one link');
}
