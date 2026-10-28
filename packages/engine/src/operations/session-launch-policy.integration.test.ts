import type { TerminalOutputResponse } from '@agentclientprotocol/sdk';
import { createAgentMetadata } from '@repo/mocks/agent';
import { expect, it, onTestFinished, vi } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { fixtureRegistry } from '#mocks/agent-fixtures';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';
import { withoutSessionAccess } from '#mocks/session-access';

it('clears inherited and Registry Argo credentials when launch policy denies Session access', async () => {
  vi.stubEnv('ARGO_TOKEN', 'stale-inherited-token');
  vi.stubEnv('ARGO_HOME', '/wrong-inherited-home');
  onTestFinished(() => {
    vi.unstubAllEnvs();
  });

  const registry = fixtureRegistry([createAgentMetadata()], {
    ARGO_TOKEN: 'stale-registry-token',
    ARGO_HOME: '/wrong-registry-home',
  });

  const outputs: TerminalOutputResponse[] = [];

  const host = await startAcpEngine({
    sessionAccess: withoutSessionAccess,
    fetchAgents: async () => JSON.stringify(registry),
    steps: [
      {
        type: 'terminal',
        toolCallId: 'environment',
        request: {
          command: process.execPath,
          args: [
            '-e',
            'console.log(JSON.stringify({token:process.env.ARGO_TOKEN ?? null,home:process.env.ARGO_HOME ?? null}))',
          ],
        },
        completion: 'wait-for-exit',
        outputs,
      },
    ],
  });

  await host.caller.registry.refresh();

  const first = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'First' }],
  });

  await waitForAcpSessionIdle(host, first.sessionId);

  const second = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'Second' }],
  });

  await waitForAcpSessionIdle(host, second.sessionId);
  expect(outputs.map(({ output }) => JSON.parse(output))).toEqual([
    { token: null, home: null },
    { token: null, home: null },
  ]);
  expect(host.agent.processes).toHaveLength(1);
  await host.caller.session.close(first);
  expect(requireScriptedProcessAt(host.agent.processes).terminations).toBe(0);
  await host.caller.session.prompt({
    ...second,
    prompt: [{ type: 'text', text: 'Still open' }],
  });
  await waitForAcpSessionIdle(host, second.sessionId);
  expect(host.agent.processes).toHaveLength(1);
});
