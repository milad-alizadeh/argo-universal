import type {
  InitializeResponse,
  PromptResponse,
  UsageUpdate,
} from '@agentclientprotocol/sdk';
import { TurnUsage, type ContextUsage } from '@repo/contracts';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSnapshot, waitForAcpSessionIdle } from '#mocks/acp-feed';

const modelCallScope = 'model-call' as const;
const codexName = '@agentclientprotocol/codex-acp';
const usageUpdate = 'usage_update' as const;
const context = { used: 34_000, size: 200_000 } satisfies UsageUpdate;
const initialization = (name: string, version: string): InitializeResponse => ({
  protocolVersion: 1,
  agentInfo: { name, version },
  agentCapabilities: { sessionCapabilities: { close: {} } },
});

it.each<[string, PromptResponse['usage'], object | null]>([
  ['missing', undefined, null],
  ['explicitly unavailable', null, null],
  [
    'optional detail unavailable',
    {
      totalTokens: 12_000,
      inputTokens: 8_000,
      outputTokens: 2_000,
      cachedReadTokens: 2_000,
      thoughtTokens: null,
    },
    {
      scope: 'turn',
      totalTokens: 12_000,
      inputTokens: 8_000,
      outputTokens: 2_000,
      cachedReadTokens: 2_000,
    },
  ],
  [
    'complete including zero',
    {
      totalTokens: 12_000,
      inputTokens: 8_000,
      outputTokens: 2_000,
      cachedReadTokens: 2_000,
      cachedWriteTokens: 0,
      thoughtTokens: 0,
    },
    {
      scope: 'turn',
      totalTokens: 12_000,
      inputTokens: 8_000,
      outputTokens: 2_000,
      cachedReadTokens: 2_000,
      cachedWriteTokens: 0,
      thoughtTokens: 0,
    },
  ],
])(
  'stores %s prompt usage without inventing counters',
  async (_, usage, expected) => {
    const host = await startAcpEngine({
      initialize: initialization(
        '@agentclientprotocol/claude-agent-acp',
        '0.88.0',
      ),
      steps: [],
      responses: {
        'session/prompt': [{ result: { stopReason: 'end_turn', usage } }],
      },
    });
    const created = await host.caller.session.new(emptySessionInput);
    await host.caller.session.prompt({
      ...created,
      prompt: [{ type: 'text', text: 'Report usage' }],
    });
    await waitForAcpSessionIdle(host, created.sessionId);
    const row = host.database.$client
      .prepare('SELECT usage FROM turn WHERE session_id = ?')
      .get(created.sessionId);
    expect(
      row?.usage === null
        ? null
        : TurnUsage.parse(JSON.parse(String(row?.usage))),
    ).toEqual(expected);
  },
);

it('retains only the Codex latest sample without calling it a whole-Turn total', async () => {
  const usage = {
    totalTokens: 1_000,
    inputTokens: 700,
    outputTokens: 200,
    cachedReadTokens: 100,
    thoughtTokens: 50,
  } satisfies NonNullable<PromptResponse['usage']>;
  const host = await startAcpEngine({
    initialize: initialization(codexName, '2.1.1'),
    steps: [],
    responses: {
      'session/prompt': [
        {
          steps: [
            {
              type: 'update',
              update: {
                sessionUpdate: usageUpdate,
                used: 5_000,
                size: 200_000,
              },
            },
            {
              type: 'update',
              update: {
                sessionUpdate: usageUpdate,
                used: 1_000,
                size: 200_000,
              },
            },
          ],
          result: { stopReason: 'end_turn', usage },
        },
      ],
    },
  });
  const created = await host.caller.session.new(emptySessionInput);
  await host.caller.session.prompt({
    ...created,
    prompt: [{ type: 'text', text: 'Make several calls' }],
  });
  await waitForAcpSessionIdle(host, created.sessionId);
  const snapshot = await waitForAcpSnapshot(
    host,
    created.sessionId,
    () => true,
  );
  expect(snapshot.usage).toEqual({
    used: 1_000,
    size: 200_000,
    scope: modelCallScope,
  });
  const row = host.database.$client
    .prepare('SELECT usage FROM turn WHERE session_id = ?')
    .get(created.sessionId);
  expect(TurnUsage.parse(JSON.parse(String(row?.usage)))).toEqual({
    scope: modelCallScope,
    totalTokens: 1_000,
    inputTokens: 700,
    outputTokens: 200,
    cachedReadTokens: 100,
    thoughtTokens: 50,
  });
});

it('scopes context received before opening completes using the negotiated Agent identity', async () => {
  const host = await startAcpEngine({
    initialize: initialization(codexName, '2.1.1'),
    steps: [],
    responses: {
      'session/new': [
        {
          steps: [
            {
              type: 'update',
              update: { sessionUpdate: usageUpdate, ...context },
            },
          ],
        },
      ],
    },
  });
  const created = await host.caller.session.new(emptySessionInput);
  const snapshot = await waitForAcpSnapshot(
    host,
    created.sessionId,
    () => true,
  );
  expect(snapshot.usage).toEqual({
    used: 34_000,
    size: 200_000,
    scope: modelCallScope,
  });
});

it.each<[string, string, ContextUsage]>([
  ['@agentclientprotocol/claude-agent-acp', '0.88.0', context],
  [
    '@agentclientprotocol/codex-acp',
    '2.1.1',
    { ...context, scope: modelCallScope },
  ],
])(
  'preserves %s context counters with their verified scope',
  async (name, version, expected) => {
    const host = await startAcpEngine({
      initialize: initialization(name, version),
      steps: [
        {
          type: 'update',
          update: { sessionUpdate: usageUpdate, ...context },
        },
      ],
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
