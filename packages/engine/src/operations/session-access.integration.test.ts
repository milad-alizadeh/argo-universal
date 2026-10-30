import { mkdirSync, readFileSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  AuthenticateRequest,
  TerminalOutputResponse,
} from '@agentclientprotocol/sdk';
import { createAgentMetadata } from '@repo/mocks/agent';
import { protocolSessionLogin } from '@repo/mocks/agent/protocol-login';
import { expect, it, onTestFinished } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { agentCredentials } from '#mocks/agent-credentials';
import { fixtureRegistry } from '#mocks/agent-fixtures';
import { publishControlAddress } from '#mocks/operations';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';
import { addOtherProject, discoverOptions } from '#mocks/session-access';
import { agentEnvironment } from '../agents';

it('lets an Agent run argo without Node on PATH and shows the call as an ordinary Feed Tool call', async () => {
  const outputs: TerminalOutputResponse[] = [];

  const host = await startAcpEngine({
    fetchAgents: async () =>
      JSON.stringify(
        fixtureRegistry([createAgentMetadata()], {
          ARGO_TOKEN: 'stale-registry-token',
          ARGO_HOME: '/wrong-registry-home',
        }),
      ),
    steps: [
      {
        type: 'terminal',
        toolCallId: 'argo-projects',
        request: {
          command: 'argo',
          args: ['run', 'project.list'],
          env: [
            { name: 'PATH', value: '/no-node-runtime' },
            { name: 'ARGO_TOKEN', value: 'stale-terminal-token' },
            { name: 'ARGO_HOME', value: '/wrong-terminal-home' },
          ],
        },
        completion: 'wait-for-exit',
        outputs,
      },
    ],
  });

  await host.caller.registry.refresh();
  publishControlAddress(host);

  const cliEntry = fileURLToPath(
    new URL('../../../../apps/cli/bin/argo.mjs', import.meta.url),
  );

  const originalEntry = readFileSync(cliEntry, 'utf8');
  const bin = join(host.home, 'cli', 'bin');
  mkdirSync(bin, { recursive: true });
  symlinkSync(cliEntry, join(bin, 'argo'));

  const created = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'List my Projects' }],
  });

  await waitForAcpSessionIdle(host, created.sessionId);
  expect(readFileSync(cliEntry, 'utf8')).toBe(originalEntry);
  expect(outputs).toMatchObject([{ exitStatus: { exitCode: 0 } }]);
  expect(JSON.parse(outputs[0]?.output ?? '')).toContainEqual(
    expect.objectContaining({ id: 'project-1', inScope: true }),
  );
  expect(
    (await host.caller.feed.page({ ...created, direction: 'tail' })).rows,
  ).toContainEqual(
    expect.objectContaining({
      sessionUpdate: 'tool_call_update',
      name: 'project.list',
      status: 'completed',
    }),
  );
}, 30_000);

it('shares sign-in for isolated Sessions without giving its process a Session token', async () => {
  const received = Promise.withResolvers<AuthenticateRequest>();
  const release = Promise.withResolvers<void>();
  onTestFinished(() => release.resolve());
  const requests: AuthenticateRequest[] = [];
  const scenario = protocolSessionLogin(agentCredentials({ signedIn: true }));

  const host = await startAcpEngine({
    ...scenario,
    responses: {
      authenticate: [{ received, waitFor: release.promise, requests }],
    },
  });

  const first = await host.caller.session.new(emptySessionInput);
  const second = await host.caller.session.new(emptySessionInput);
  const subject = { agent: 'mock', projectId: 'project-1' };

  const pending = host.caller.agents.authenticate({
    ...subject,
    methodId: 'login',
    sessionId: first.sessionId,
  });

  await received.promise;

  const sibling = host.caller.agents.authenticate({
    ...subject,
    methodId: 'login',
    sessionId: second.sessionId,
  });

  await expect
    .poll(() => host.caller.agents.authState(subject), { timeout: 1000 })
    .toMatchObject({ pending: { methodId: 'login' } });
  release.resolve();
  expect(await Promise.all([pending, sibling])).toEqual([
    { status: 'ok' },
    { status: 'ok' },
  ]);
  expect(requests).toHaveLength(1);
  await discoverOptions(host, subject);
  expect(host.agent.processes).toHaveLength(3);
  expect(
    (
      await agentEnvironment(
        requireScriptedProcessAt(host.agent.processes, 2).launch,
      )
    ).ARGO_TOKEN,
  ).toBeUndefined();
  await host.caller.session.close(first);
  await host.caller.session.close(second);
  expect(requireScriptedProcessAt(host.agent.processes, 2).terminations).toBe(
    0,
  );
});

// A Project registers at its resolved main checkout, so a fixture home reached through a symlink would hide it.
it('registers a Project seeded under the fixture home at the path the fixture built', async () => {
  const host = await startAcpEngine();
  const projectId = await addOtherProject(host);

  expect(await host.caller.project.list()).toContainEqual(
    expect.objectContaining({
      id: projectId,
      path: join(host.home, 'other-project'),
    }),
  );
});
