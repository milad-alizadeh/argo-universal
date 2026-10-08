import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { openAppServer } from '../../../packages/agents/codex/open-app-server';
import { mockCliScenarioEnvironment } from '../mock-cli';
import { writeMockCodex } from './write-mock-codex';

const directories: string[] = [];
afterEach(async (): Promise<void> => {
  vi.unstubAllEnvs();
  for (const directory of directories.splice(0))
    await rm(directory, { recursive: true, force: true });
});
async function start(
  malformedPayload: boolean,
): Promise<ReturnType<typeof openAppServer>> {
  const cwd = await mkdtemp(path.join(tmpdir(), 'agent-startup-'));
  directories.push(cwd);
  await writeMockCodex(cwd, { recording: 'reply' });
  vi.stubEnv('PATH', cwd);
  for (const [name, value] of Object.entries(
    mockCliScenarioEnvironment({ malformedPayload }),
  ))
    vi.stubEnv(name, value);
  return openAppServer(
    cwd,
    (): void => {},
    (): void => {},
    new AbortController().signal,
  );
}
const input = {
  clientInfo: { name: 'argo', title: 'Argo', version: '0.0.0' },
  capabilities: { experimentalApi: true, requestAttestation: false },
};
it('accepts the captured initialization through the production transport', async (): Promise<void> => {
  const server = await start(false);
  try {
    await expect(server.request('initialize', input)).resolves.toMatchObject({
      platformFamily: 'unix',
      platformOs: 'macos',
    });
  } finally {
    await server.close();
  }
});
it('rejects a missing native Turn field before accepting a start response', async (): Promise<void> => {
  const server = await start(true);
  try {
    await expect(
      server.request('turn/start', { threadId: 'recorded-thread', input: [] }),
    ).rejects.toThrow('Invalid app-server response: turn/start');
  } finally {
    await server.close();
  }
});
