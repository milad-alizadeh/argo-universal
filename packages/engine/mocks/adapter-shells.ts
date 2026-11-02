import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { SessionNotification } from '@agentclientprotocol/sdk';
import { onTestFinished } from 'vitest';
import type { MemoryShells } from './memory-shells';

// Sends several notifications from the Agent, in order.
export const sender =
  (notify: MemoryShells['notify']) =>
  (updates: SessionNotification['update'][]): void => {
    for (const update of updates) notify({ sessionId: 'acp-session', update });
  };

// A file an Agent writes a background command's output to.
export const writeTaskFile = async (content: string): Promise<string> => {
  const folder = await mkdtemp(join(tmpdir(), 'adapter-shells-'));
  onTestFinished(() => rm(folder, { recursive: true, force: true }));
  const path = join(folder, 'b1.output');
  await writeFile(path, content);

  return path;
};
