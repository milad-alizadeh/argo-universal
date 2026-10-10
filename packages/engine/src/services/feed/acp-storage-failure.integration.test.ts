import type {
  CancelNotification,
  PromptResponse,
} from '@agentclientprotocol/sdk';
import { expect, it, vi } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { sendAcpFeedUpdates, waitForAcpSessionIdle } from '#mocks/acp-feed';

// More settled tool rows than the Writer keeps queued for the Feed.
const toolCount = 300;
const storageTimeoutMs = 30_000;
const holdToolRows =
  "CREATE TRIGGER hold_tool_rows BEFORE INSERT ON feed_row WHEN NEW.session_update = 'tool_call_update' BEGIN SELECT RAISE(FAIL, 'storage failure'); END";

type FailingTurn = {
  host: Awaited<ReturnType<typeof startAcpEngine>>;
  sessionId: string;
  cancels: CancelNotification[];
  prompts: () => number;
  prompt: (text: string) => Promise<unknown>;
  recover: () => void;
};

// A Turn whose settled tool rows outgrow the Writer while `feed_row` inserts fail, run until the Session is idle.
const runFailingTurn = async (): Promise<FailingTurn> => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const cancels: CancelNotification[] = [];
  const cancelled = Promise.withResolvers<PromptResponse>();
  let prompts = 0;
  const host = await startAcpEngine({
    cancel: ({ params }) => {
      cancels.push(params);
      cancelled.resolve({ stopReason: 'cancelled' });
    },
    prompt: async (request) => {
      prompts += 1;
      if (prompts > 1) return { stopReason: 'end_turn' };
      host.database.$client.exec(holdToolRows);
      await sendAcpFeedUpdates(
        request,
        Array.from({ length: toolCount }, (_, index) => ({
          sessionUpdate: 'tool_call' as const,
          toolCallId: `tool-${index}`,
          title: `Read ${index}`,
          status: 'completed' as const,
        })),
      );
      return cancelled.promise;
    },
  });
  const created = await host.caller.session.new(emptySessionInput);
  const prompt = (text: string): Promise<unknown> =>
    host.caller.session.prompt({
      ...created,
      prompt: [{ type: 'text', text }],
    });
  const recover = (): void =>
    host.database.$client.exec('DROP TRIGGER IF EXISTS hold_tool_rows');
  await prompt('Read everything');
  await cancelled.promise;
  await waitForAcpSessionIdle(host, created.sessionId);
  return {
    host,
    sessionId: created.sessionId,
    cancels,
    prompts: (): number => prompts,
    prompt,
    recover,
  };
};

const readStored = ({ host, sessionId }: FailingTurn, query: string): unknown =>
  host.database.$client.prepare(query).get(sessionId);

it(
  'a Turn that outgrows the Writer while storage fails is cancelled once',
  async () => {
    const turn = await runFailingTurn();
    turn.recover();

    expect(turn.cancels).toHaveLength(1);
  },
  storageTimeoutMs,
);

it(
  'prompts are refused while storage fails and the Agent is not prompted',
  async () => {
    const turn = await runFailingTurn();
    await expect(turn.prompt('Again')).rejects.toThrow(/could not be saved/);
    turn.recover();

    expect(turn.prompts()).toBe(1);
  },
  storageTimeoutMs,
);

it(
  'once storage recovers, the cancelled Turn ends with a storage error and every refused tool row is stored',
  async () => {
    const turn = await runFailingTurn();
    turn.recover();

    await expect
      .poll(
        () =>
          readStored(
            turn,
            "SELECT stop_reason AS stopReason, error FROM turn WHERE session_id = ? AND status = 'ended'",
          ),
        { timeout: 10_000 },
      )
      .toEqual({
        stopReason: 'error',
        error: expect.stringContaining('Storage is failing'),
      });
    await expect
      .poll(
        () =>
          readStored(
            turn,
            "SELECT count(*) AS rows FROM feed_row WHERE session_id = ? AND session_update = 'tool_call_update'",
          ),
        { timeout: 10_000 },
      )
      .toEqual({ rows: toolCount });
  },
  storageTimeoutMs,
);

it(
  'a prompt reaches the Agent once storage recovers',
  async () => {
    const turn = await runFailingTurn();
    turn.recover();
    await expect
      .poll(() =>
        readStored(
          turn,
          "SELECT count(*) AS turns FROM turn WHERE session_id = ? AND status = 'ended'",
        ),
      )
      .toEqual({ turns: 1 });
    await turn.prompt('Once storage recovers');
    await waitForAcpSessionIdle(turn.host, turn.sessionId);

    expect(turn.prompts()).toBe(2);
  },
  storageTimeoutMs,
);
