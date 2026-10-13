import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CustomAgentDefinition } from '@repo/contracts';
import { scriptedAgentCommand } from '@repo/mocks/agent/scripted-agent-launch';
import { initTestRepository } from '@repo/mocks/git/test-repository';
import { onTestFinished } from 'vitest';
import type { EngineInput } from '../src/engine/machine';
import { openTestDatabase } from './database';
import { startEngineTestHost } from './engine';

export const customAgentDefinition: CustomAgentDefinition = {
  name: 'Fixture ACP',
  ...scriptedAgentCommand('reply'),
  env: [{ name: 'ARGO_348_PRESENT', value: 'fixture' }],
};

export const gatedCustomAgentDefinition = (
  marker: string,
  release: string,
  scenario: Parameters<typeof scriptedAgentCommand>[0] = 'reply',
): CustomAgentDefinition => ({
  ...customAgentDefinition,
  args: [
    '--import',
    fileURLToPath(new URL('./probe-gate.mjs', import.meta.url)),
    ...scriptedAgentCommand(scenario).args,
  ],
  env: [
    { name: 'ARGO_PROBE_EXIT_MARKER', value: marker },
    { name: 'ARGO_PROBE_RELEASE', value: release },
  ],
});

// An Engine over a real Project repository and real ACP process launches, with no launch resolver stand-in.
export const startCustomAgentEngine = async (
  options: Pick<Partial<EngineInput>, 'acp'> = {},
): Promise<Awaited<ReturnType<typeof startEngineTestHost>>> => {
  const directory = mkdtempSync(join(tmpdir(), 'argo-custom-agent-'));
  await initTestRepository(directory);
  const storage = openTestDatabase({}, directory);
  onTestFinished(() => {
    storage.remove();
    rmSync(directory, { recursive: true, force: true });
  });
  return startEngineTestHost({ database: storage.database, ...options });
};
