import { join } from 'node:path';
import type {
  NewSessionRequest,
  ResumeSessionRequest,
} from '@agentclientprotocol/sdk';
import { assert, expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { operationCaller, runOperation } from '#mocks/operations';
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

it('automatically supplies isolated MCP credentials to new Sessions, never configuration discovery or disabled Sessions', async () => {
  const openings: NewSessionRequest[] = [];

  const host = await startAcpEngine({
    steps: [],
    responses: { 'session/new': [{ requests: openings }] },
  });

  const first = await host.caller.session.new(emptySessionInput);
  const second = await host.caller.session.new(emptySessionInput);
  const firstServers = requestAt(openings, 0).mcpServers;
  const secondServers = requestAt(openings, 1).mcpServers;

  expect(firstServers).toMatchObject([
    {
      name: 'argo',
      command: join(host.home, 'cli', 'bin', 'argo'),
      args: ['mcp'],
      env: [
        { name: 'ARGO_HOME', value: host.home },
        { name: 'ARGO_TOKEN', value: expect.any(String) },
      ],
    },
  ]);
  expect(secondServers).not.toEqual(firstServers);
  await discoverOptions(host, { agent: 'mock', projectId: 'project-1' });
  expect(requestAt(openings, 2).mcpServers).toEqual([]);
  const user = await operationCaller(host);
  await runOperation(user.operations, {
    id: 'agent.setAccess',
    params: { enabled: false },
  });
  const disabled = await host.caller.session.new(emptySessionInput);
  expect(requestAt(openings, 3).mcpServers).toEqual([]);
  await host.caller.session.close(first);
  await host.caller.session.close(second);
  await host.caller.session.close(disabled);
}, 30_000);

it('supplies a fresh MCP token when a Session resumes after its Agent process exits', async () => {
  const openings: NewSessionRequest[] = [];
  const resumed: ResumeSessionRequest[] = [];

  const host = await startAcpEngine({
    steps: [],
    responses: {
      'session/new': [{ requests: openings }],
      'session/resume': [{ requests: resumed }],
    },
  });

  const created = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'First' }],
  });

  await waitForAcpSessionIdle(host, created.sessionId);
  const events = await host.caller.feed.subscribe({ ...created, after: null });
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
  expect(request.mcpServers).toMatchObject([{ name: 'argo', args: ['mcp'] }]);
  expect(request.mcpServers).not.toEqual(requestAt(openings, 0).mcpServers);
}, 30_000);
