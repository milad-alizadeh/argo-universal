import { join } from 'node:path';
import type {
  NewSessionRequest,
  ResumeSessionRequest,
  McpServerStdio,
  InitializeResponse,
} from '@agentclientprotocol/sdk';
import { assert, expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { resourceInitialization } from '#mocks/acp-resource';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';
import { discoverOptions } from '#mocks/session-access';

function requestAt(
  requests: NewSessionRequest[],
  index: number,
): NewSessionRequest {
  const request = requests.at(index);

  assert(request);

  return request;
}

function serverAt(
  request: NewSessionRequest | ResumeSessionRequest,
): McpServerStdio {
  const [server] = request.mcpServers ?? [];

  assert(server);
  assert('command' in server);

  return server;
}

async function recordedOpenings(): Promise<{
  host: Awaited<ReturnType<typeof startAcpEngine>>;
  openings: NewSessionRequest[];
}> {
  const openings: NewSessionRequest[] = [];

  const host = await startAcpEngine({
    steps: [],
    responses: { 'session/new': [{ requests: openings }] },
  });

  return { host, openings };
}

it('supplies isolated MCP credentials to each new Session', async () => {
  const { host, openings } = await recordedOpenings();

  const first = await host.caller.session.new(emptySessionInput);
  const second = await host.caller.session.new(emptySessionInput);
  const firstServer = serverAt(requestAt(openings, 0));
  const secondServer = serverAt(requestAt(openings, 1));

  expect(firstServer).toMatchObject({
    name: expect.stringMatching(/^argo-/),
    command: join(host.home, 'cli', 'bin', 'argo'),
    args: ['mcp'],
    env: [
      { name: 'ARGO_HOME', value: host.home },
      { name: 'ARGO_TOKEN', value: expect.any(String) },
    ],
  });
  expect(firstServer.name).not.toBe('argo');
  expect(secondServer.name).not.toBe(firstServer.name);
  expect(secondServer.env).not.toEqual(firstServer.env);
  await host.caller.session.close(first);
  await host.caller.session.close(second);
}, 30_000);

it('keeps Argo MCP credentials out of configuration discovery', async () => {
  const { host, openings } = await recordedOpenings();

  await discoverOptions(host, { agent: 'mock', projectId: 'project-1' });

  expect(requestAt(openings, 0).mcpServers).toEqual([]);
}, 30_000);

it('does not supply Argo MCP when Agent access is disabled', async () => {
  const { host, openings } = await recordedOpenings();
  await host.caller.agent.setAccess({ enabled: false });

  const disabled = await host.caller.session.new(emptySessionInput);

  expect(requestAt(openings, 0).mcpServers).toEqual([]);
  await host.caller.session.close(disabled);
}, 30_000);

function initializationFor(
  method: 'session/resume' | 'session/load',
): InitializeResponse {
  return method === 'session/resume'
    ? resourceInitialization
    : {
        protocolVersion: 1,
        agentCapabilities: {
          loadSession: true,
          sessionCapabilities: { close: {} },
        },
      };
}

it.each(['session/resume', 'session/load'] as const)(
  'supplies fresh MCP credentials on %s after the Agent process exits',
  async (method) => {
    const openings: NewSessionRequest[] = [];
    const resumed: ResumeSessionRequest[] = [];

    const host = await startAcpEngine({
      steps: [],
      responses: {
        initialize: [{ result: initializationFor(method) }],
        'session/new': [{ requests: openings }],
        [method]: [{ requests: resumed }],
      },
    });

    const created = await host.caller.session.new({
      ...emptySessionInput,
      prompt: [{ type: 'text', text: 'First' }],
    });

    await waitForAcpSessionIdle(host, created.sessionId);

    const events = await host.caller.feed.subscribe({
      ...created,
      after: null,
    });

    requireScriptedProcessAt(host.agent.processes).exited.resolve();

    for await (const event of events) if (event.type === 'closed') break;
    await host.caller.session.prompt({
      ...created,
      prompt: [{ type: 'text', text: 'Again' }],
    });
    await waitForAcpSessionIdle(host, created.sessionId);
    expect(resumed).toHaveLength(1);
    const [request] = resumed;

    assert(request);
    expect(serverAt(request).name).toBe(serverAt(requestAt(openings, 0)).name);
    expect(request.mcpServers).toMatchObject([{ args: ['mcp'] }]);
    expect(request.mcpServers).not.toEqual(requestAt(openings, 0).mcpServers);
  },
  30_000,
);
