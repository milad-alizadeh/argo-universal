import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { TerminalOutputResponse } from '@agentclientprotocol/sdk';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { startEngineTestHost } from '#mocks/engine';
import { createScriptedAgentProcess } from '#mocks/scripted-agent';
import { sessionIdentityStep } from '#mocks/session-access';

type Host = Awaited<ReturnType<typeof startEngineTestHost>>;

const launcherPath = (home: string): string => join(home, 'cli', 'bin', 'argo');

const readLauncher = (home: string): Promise<string> =>
  readFile(launcherPath(home), 'utf8');

async function openSession(host: Host): Promise<void> {
  const created = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'Read your launch environment' }],
  });

  await waitForAcpSessionIdle(host, created.sessionId);
}

async function restart(home: string, cliEntry: string): Promise<Host> {
  const outputs: TerminalOutputResponse[] = [];

  const agent = createScriptedAgentProcess({
    steps: [sessionIdentityStep(outputs)],
  });

  return startEngineTestHost({ home, acp: agent, cliEntry });
}

it('rewrites the argo launcher for the current CLI entry when a Server starts', async () => {
  const outputs: TerminalOutputResponse[] = [];
  const host = await startAcpEngine({ steps: [sessionIdentityStep(outputs)] });
  await openSession(host);
  await host.stop();

  const first = await restart(host.home, '/first/argo.mjs');
  await openSession(first);
  expect(await readLauncher(host.home)).toContain(`'/first/argo.mjs'`);
  await first.stop();

  const second = await restart(host.home, '/second/argo.mjs');
  await openSession(second);
  const launcher = await readLauncher(host.home);
  expect(launcher).toContain(`'/second/argo.mjs'`);
  expect(launcher).not.toContain('/first/argo.mjs');
  await second.stop();
}, 30_000);

it('writes the argo launcher once per Server, not at every opening', async () => {
  const outputs: TerminalOutputResponse[] = [];
  const host = await startAcpEngine({ steps: [sessionIdentityStep(outputs)] });
  await openSession(host);
  const written = await stat(launcherPath(host.home));
  await openSession(host);
  expect((await stat(launcherPath(host.home))).ino).toBe(written.ino);
}, 30_000);
