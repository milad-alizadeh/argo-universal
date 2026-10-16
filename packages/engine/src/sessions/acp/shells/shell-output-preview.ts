import type { TerminalOutputResponse } from '@agentclientprotocol/sdk';

const continuationMask = 0xc0;

const continuationPrefix = 0x80;

const isContinuation = (byte: number | undefined): boolean =>
  ((byte ?? 0) & continuationMask) === continuationPrefix;

export const terminalOutputPreview = (
  bytes: Buffer,
  limit?: number | null,
): Pick<TerminalOutputResponse, 'output' | 'truncated'> => {
  let offset = Math.max(0, bytes.length - Math.max(0, limit ?? bytes.length));
  const truncated = offset > 0;

  while (isContinuation(bytes[offset])) offset += 1;

  return { output: bytes.subarray(offset).toString('utf8'), truncated };
};
