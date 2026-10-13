import { expect, it } from 'vitest';
import {
  createResourceDestination,
  createResourceOpening,
} from '#mocks/acp-resource';
import {
  loginScenario,
  loginStatusStep,
  accountStatus,
  signedOutStatus,
} from '#mocks/agent-login';
import {
  createScriptedAgentProcess,
  requireScriptedProcessAt,
} from '#mocks/scripted-agent';
import { createAcpResources } from './index';

const invalidationReports = [
  {
    name: 'API key',
    step: loginStatusStep({ kind: 'api_key', label: 'API key' }),
  },
  { name: 'signed out', step: loginStatusStep(signedOutStatus) },
  {
    name: 'unknown billing',
    step: {
      type: 'raw',
      frame: JSON.stringify({
        jsonrpc: '2.0',
        method: '_auth/status_update',
        params: { authStatus: { kind: 'future-billing', label: 'Unknown' } },
      }),
    } as const,
  },
];
it.each(invalidationReports)(
  'fences an active Session when $name billing replaces its verified subscription',
  async ({ step }) => {
    const prompts: object[] = [];
    const failed = Promise.withResolvers<void>();
    const failures: unknown[] = [];
    const peer = createScriptedAgentProcess({
      ...loginScenario(),
      responses: {
        initialize: [{ steps: [loginStatusStep(accountStatus)] }],
        'session/prompt': [{ requests: prompts }],
      },
    });
    const resources = createAcpResources(peer);
    const lease = await resources.open(
      createResourceOpening({
        ...createResourceDestination(),
        failed: (error) => {
          failures.push(error);
          failed.resolve();
        },
      }),
    );
    const child = requireScriptedProcessAt(peer.processes);
    await child.play([step], lease.sessionId);
    await failed.promise;
    await expect(
      lease.agent.request('session/prompt', {
        sessionId: lease.sessionId,
        prompt: [{ type: 'text', text: 'Must not send' }],
      }),
    ).rejects.toThrow(/ACP connection closed/);
    await lease.released;
    expect({
      prompts,
      failures: failures.length,
      terminations: child.terminations,
    }).toEqual({ prompts: [], failures: 1, terminations: 1 });
    await resources.shutdown();
  },
);
