import type { CloseSessionRequest } from '@agentclientprotocol/sdk';
import { scenarios } from '@repo/mocks/agent/scenarios';
import { expect, it, vi } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSnapshot, waitForAcpSessionIdle } from '#mocks/acp-feed';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

it('configuration sent immediately after session/new reaches the opened Session', async () => {
  const host = await startAcpEngine({
    steps: [],
    responses: { 'session/new': [{ steps: [{ type: 'hold' }] }] },
  });

  const opening = host.caller.session.new(emptySessionInput);

  const process = await vi.waitFor(() =>
    requireScriptedProcessAt(host.agent.processes),
  );

  expect((await process.readRequest()).method).toBe('initialize');
  const request = await process.readRequest();
  await process.send([
    {
      jsonrpc: '2.0',
      id: request.id,
      result: { sessionId: 'immediate', configOptions: [] },
    },
    {
      jsonrpc: '2.0',
      method: 'session/update',
      params: {
        sessionId: 'immediate',
        update: {
          sessionUpdate: 'config_option_update',
          configOptions: [
            { id: 'fast', name: 'Fast', type: 'boolean', currentValue: true },
          ],
        },
      },
    },
  ]);
  const created = await opening;

  const snapshot = await waitForAcpSnapshot(
    host,
    created.sessionId,
    () => true,
  );

  expect(snapshot.configOptions).toContainEqual(
    expect.objectContaining({ configId: 'fast', currentValue: true }),
  );
});

it('a Session runs a Turn when its Agent does not advertise session/close', async () => {
  const closes: CloseSessionRequest[] = [];

  const host = await startAcpEngine({
    ...scenarios.reply,
    initialize: { protocolVersion: 1, agentCapabilities: {} },
    responses: { 'session/close': [{ requests: closes }] },
  });

  const created = await host.caller.session.new(emptySessionInput);
  await host.caller.session.prompt({
    ...created,
    prompt: [{ type: 'text', text: 'First' }],
  });
  await waitForAcpSessionIdle(host, created.sessionId);
  await host.caller.session.close(created);
  expect(closes).toEqual([]);
});
