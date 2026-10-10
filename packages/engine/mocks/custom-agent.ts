import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CustomAgentDefinition } from '@repo/contracts';
import { onTestFinished } from 'vitest';
import { openTestDatabase } from './database';
import { startEngineTestHost } from './engine';
import { initTestRepository } from './git';

export const acpProgram = fileURLToPath(
  new URL('./acp-process.mts', import.meta.url),
);
export const customAgentDefinition: CustomAgentDefinition = {
  name: 'Fixture ACP',
  executable: process.execPath,
  args: [acpProgram],
  env: [{ name: 'ARGO_348_PRESENT', value: 'fixture' }],
};

// An Engine over a real Project repository and real ACP process launches, with no launch resolver stand-in.
export const startCustomAgentEngine = async (): Promise<
  Awaited<ReturnType<typeof startEngineTestHost>>
> => {
  const directory = mkdtempSync(join(tmpdir(), 'argo-custom-agent-'));
  initTestRepository(directory);
  const storage = openTestDatabase({}, directory);
  onTestFinished(() => {
    storage.remove();
    rmSync(directory, { recursive: true, force: true });
  });
  return startEngineTestHost({ database: storage.database });
};
