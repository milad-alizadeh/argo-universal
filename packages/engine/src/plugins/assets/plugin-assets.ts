import { createHash, randomUUID } from 'node:crypto';
import {
  mkdir,
  rename,
  rm,
  writeFile,
  type FileHandle,
} from 'node:fs/promises';
import { join } from 'node:path';
import { PluginAssetRef } from '@repo/contracts/plugins/assets';
import { openExisting, openFlags } from '../services/plugin-file-open';
import type { AssetContent } from './content';

export type OpenedAsset = {
  file: FileHandle;
  bytes: number;
  reference: PluginAssetRef;
};

export class PluginAssets {
  constructor(private readonly home: string) {}

  public async save(
    pluginId: string,
    content: AssetContent,
  ): Promise<PluginAssetRef> {
    const reference = PluginAssetRef.parse({
      pluginId,
      format: content.format,
      hash: createHash('sha256').update(content.bytes).digest('hex'),
    });

    const folder = this.folderOf(reference);
    await mkdir(folder, { recursive: true, mode: 0o700 });
    await this.writeContent(reference, content.bytes);

    return reference;
  }

  private async writeContent(
    reference: PluginAssetRef,
    bytes: Buffer,
  ): Promise<void> {
    const folder = this.folderOf(reference);
    const temporary = join(folder, randomUUID());

    try {
      await writeFile(temporary, bytes, { mode: 0o600 });
      await rename(temporary, this.fileOf(reference));
    } finally {
      await rm(temporary, { force: true });
    }
  }

  public async open(reference: PluginAssetRef): Promise<OpenedAsset | null> {
    const opened = await openExisting(this.fileOf(reference), openFlags).catch(
      (error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return null;
        throw error;
      },
    );

    if (!opened) return null;

    const info = await opened.handle.stat();

    if (info.isFile())
      return { file: opened.handle, bytes: info.size, reference };
    await opened.handle.close();

    return null;
  }

  private folderOf(reference: PluginAssetRef): string {
    return join(this.home, 'plugin-assets', reference.pluginId);
  }

  private fileOf(reference: PluginAssetRef): string {
    return join(
      this.folderOf(reference),
      `${reference.hash}.${reference.format}`,
    );
  }
}
