import type { InitializeResponse } from '@agentclientprotocol/sdk';
import { type ContextUsage } from '@repo/contracts';
import { scenarios } from '@repo/mocks/agent/scenarios';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSnapshot, waitForAcpSessionIdle } from '#mocks/acp-feed';

const modelCallScope = 'model-call' as const;

const codexName = '@agentclientprotocol/codex-acp';

const initialization = (name: string, version: string): InitializeResponse => ({
  protocolVersion: 1,
  agentInfo: { name, version },
  agentCapabilities: {
    sessionCapabilities: { close: {} },
  },
});

it.each(
  (
    [
      { scenario: 'usage-low', used: 20_000 },
      { scenario: 'usage-high', used: 170_000 },
      { scenario: 'usage-full', used: 200_000 },
    ] as const
  ).flatMap(({ scenario, used }) => [
    {
      scenario,
      name: '@agentclientprotocol/claude-agent-acp',
      version: '0.88.0',
      expected: { used, size: 200_000 } satisfies ContextUsage,
    },
    {
      scenario,
      name: codexName,
      version: '2.1.1',
      expected: {
        used,
        size: 200_000,
        scope: modelCallScope,
      } satisfies ContextUsage,
    },
  ]),
)(
  'preserves $name $scenario counters with their verified scope',
  async ({ scenario, name, version, expected }) => {
    const host = await startAcpEngine({
      ...scenarios[scenario],
      initialize: initialization(name, version),
    });

    const created = await host.caller.session.new(emptySessionInput);
    await host.caller.session.prompt({
      ...created,
      prompt: [{ type: 'text', text: 'Report context' }],
    });
    await waitForAcpSessionIdle(host, created.sessionId);

    const snapshot = await waitForAcpSnapshot(
      host,
      created.sessionId,
      () => true,
    );

    expect(snapshot.usage).toEqual(expected);
  },
);
