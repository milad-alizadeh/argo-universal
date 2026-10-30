import type {
  InitializeResponse,
  PromptResponse,
} from '@agentclientprotocol/sdk';
import { TurnUsage } from '@repo/contracts';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';

const initialization = (name: string, version: string): InitializeResponse => ({
  protocolVersion: 1,
  agentInfo: { name, version },
  agentCapabilities: {
    sessionCapabilities: { close: {} },
  },
});

type StoredUsageRow = { usage?: string | number | bigint | Uint8Array | null };

const readTurnUsage = (row: StoredUsageRow | undefined): TurnUsage | null => {
  const usage = row?.usage;

  return usage === null ? null : TurnUsage.parse(JSON.parse(String(usage)));
};

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

    expect(readTurnUsage(row)).toEqual(expected);
  },
);
