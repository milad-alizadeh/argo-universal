import { open, type FileHandle } from 'node:fs/promises';
import type { TerminalOutputResponse } from '@agentclientprotocol/sdk';
import { terminalOutputPreview } from './shell-output-preview';

type Preview = Pick<TerminalOutputResponse, 'output' | 'truncated'>;

const previewBytes = 65_536;

const previewLimit = (requested?: number | null): number =>
  Math.min(previewBytes, Math.max(0, requested ?? previewBytes));

const readTail = async (file: FileHandle, limit: number): Promise<Preview> => {
  const total = (await file.stat()).size;
  const offset = Math.max(0, total - limit);
  const bytes = Buffer.alloc(Math.min(total, limit));
  const { bytesRead } = await file.read(bytes, 0, bytes.length, offset);

  return {
    ...terminalOutputPreview(bytes.subarray(0, bytesRead), limit),
    truncated: offset > 0,
  };
};

export const readShellPreview = async (
  path: string,
  requested?: number | null,
): Promise<Preview> => {
  const file = await open(path, 'r');

  try {
    return await readTail(file, previewLimit(requested));
  } finally {
    await file.close();
  }
};
