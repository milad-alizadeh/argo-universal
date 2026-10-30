import type { SessionUpdate } from '@repo/contracts';
import { turn } from '@repo/db/schema';
import type { ScriptedScenario } from '@repo/mocks/agent/scripted-scenario';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle, waitForAcpSnapshot } from '#mocks/acp-feed';
import {
  closeStream,
  isTurnComplete,
  readThrough,
} from '#mocks/feed-stream-reading';

type AcpEngine = Awaited<ReturnType<typeof startAcpEngine>>;

type PromptResponses = NonNullable<
  ScriptedScenario['responses']
>['session/prompt'];

// The actionable message an Agent hands back instead of settling the prompt silently.
const providerMessage =
  '400 Third-party apps now draw from your extra usage, not your plan limits. Add more at claude.ai/settings/usage and keep going.';

const providerError = { code: -32603, message: providerMessage };

const startSession = async (
  prompts: PromptResponses,
): Promise<{ host: AcpEngine; session: { sessionId: string } }> => {
  const host = await startAcpEngine({
    steps: [],
    responses: { 'session/prompt': prompts },
  });

  return { host, session: await host.caller.session.new(emptySessionInput) };
};

const send = async (
  host: AcpEngine,
  sessionId: string,
  text: string,
): Promise<void> => {
  await host.caller.session.prompt({
    sessionId,
    prompt: [{ type: 'text', text }],
  });
};

// The Turn's settled ending, which the Feed keeps as its last row.
const endingRow = async (
  host: AcpEngine,
  sessionId: string,
): Promise<SessionUpdate | undefined> => {
  const page = await host.caller.feed.page({ sessionId, direction: 'tail' });

  return page.rows.at(-1);
};

const storedTurns = (
  host: AcpEngine,
  sessionId: string,
): Pick<typeof turn.$inferSelect, 'status' | 'stopReason' | 'error'>[] =>
  host.database
    .select({
      status: turn.status,
      stopReason: turn.stopReason,
      error: turn.error,
    })
    .from(turn)
    .where(eq(turn.sessionId, sessionId))
    .all();

describe('an Agent that rejects a prompt', () => {
  it('settles the Turn as an error ending carrying the provider message', async () => {
    const { host, session } = await startSession([{ error: providerError }]);

    const stream = (
      await host.caller.feed.subscribe({ ...session, after: null })
    )[Symbol.asyncIterator]();

    await stream.next();
    await send(host, session.sessionId, 'Hello');
    const events = await readThrough(stream, isTurnComplete);
    await waitForAcpSessionIdle(host, session.sessionId);
    const ending = await endingRow(host, session.sessionId);
    expect(ending).toMatchObject({
      sessionUpdate: 'notice',
      state: 'settled',
      _meta: {
        argo: { turnEnd: { stopReason: 'error', error: providerError } },
      },
    });
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'row.upsert', row: ending }),
    );
    await expect
      .poll(() => storedTurns(host, session.sessionId))
      .toEqual([
        {
          status: 'ended',
          stopReason: 'error',
          error: expect.objectContaining({ message: providerMessage }),
        },
      ]);
    await closeStream(stream);
  });

  it('accepts the next Prompt, which ends without the earlier error', async () => {
    const { host, session } = await startSession([
      { error: providerError },
      { result: { stopReason: 'end_turn' } },
    ]);

    await send(host, session.sessionId, 'Hello');
    await waitForAcpSessionIdle(host, session.sessionId);
    await send(host, session.sessionId, 'Try again');
    await waitForAcpSessionIdle(host, session.sessionId);
    expect(await endingRow(host, session.sessionId)).toMatchObject({
      _meta: { argo: { turnEnd: { stopReason: 'end_turn', error: null } } },
    });
    expect(storedTurns(host, session.sessionId).at(-1)).toMatchObject({
      stopReason: 'end_turn',
      error: null,
    });
  });

  it('keeps a cancelled Turn cancelled when the rejection follows the cancel', async () => {
    const { host, session } = await startSession([
      { steps: [{ type: 'wait-for-cancel' }], error: providerError },
    ]);

    await send(host, session.sessionId, 'Hello');
    await waitForAcpSnapshot(
      host,
      session.sessionId,
      (snapshot) => snapshot.state === 'running',
    );
    await host.caller.session.cancel({ sessionId: session.sessionId });
    await waitForAcpSessionIdle(host, session.sessionId);
    expect(await endingRow(host, session.sessionId)).toMatchObject({
      sessionUpdate: 'notice',
      state: 'settled',
      _meta: { argo: { turnEnd: { stopReason: 'cancelled', error: null } } },
    });
    await expect
      .poll(() => storedTurns(host, session.sessionId))
      .toEqual([{ status: 'ended', stopReason: 'cancelled', error: null }]);
  });
});
