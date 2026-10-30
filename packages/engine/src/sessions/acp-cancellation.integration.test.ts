import type {
  CancelNotification,
  NewSessionRequest,
} from '@agentclientprotocol/sdk';
import type { SessionNewInput } from '@repo/contracts';
import { turn } from '@repo/db/schema';
import { appFixtureAgentIds } from '@repo/mocks/agent/app-fixtures';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle, waitForAcpSnapshot } from '#mocks/acp-feed';

describe.each(appFixtureAgentIds)('%s ACP lifecycle', (agentId) => {
  const sessionInput = { ...emptySessionInput, agent: agentId };

  type AcpEngine = Awaited<ReturnType<typeof startAcpEngine>>;

  const startCancellableEngine = async (): Promise<{
    host: AcpEngine;
    cancels: CancelNotification[];
    openings: NewSessionRequest[];
    release: (acpSessionId: string) => void;
  }> => {
    const cancels: CancelNotification[] = [];
    const openings: NewSessionRequest[] = [];
    const finishSibling = Promise.withResolvers<void>();

    const host = await startAcpEngine(
      {
        steps: [],
        responses: {
          'session/new': [{ requests: openings }],
          'session/prompt': ['owned-1', 'owned-2'].map((sessionId) => ({
            sessionId,
            result: {
              stopReason:
                sessionId === 'owned-1'
                  ? ('cancelled' as const)
                  : ('end_turn' as const),
            },
            steps: [
              {
                type: 'wait-for-cancel' as const,
                until:
                  sessionId === 'owned-2' ? finishSibling.promise : undefined,
              },
              {
                type: 'update' as const,
                update: {
                  sessionUpdate: 'agent_message_chunk' as const,
                  content: {
                    type: 'text' as const,
                    text: `Final output after cancel ${sessionId}`,
                  },
                },
              },
            ],
          })),
        },
        notifications: { 'session/cancel': { requests: cancels } },
      },
      undefined,
      agentId,
    );

    return { host, cancels, openings, release: () => finishSibling.resolve() };
  };

  const startTurn = async (
    host: AcpEngine,
    checkout: SessionNewInput['checkout'] = sessionInput.checkout,
  ): Promise<string> => {
    const { sessionId } = await host.caller.session.new({
      ...sessionInput,
      checkout,
    });

    await host.caller.session.prompt({
      sessionId,
      prompt: [{ type: 'text', text: 'Start' }],
    });
    await waitForAcpSnapshot(
      host,
      sessionId,
      (snapshot) => snapshot.state === 'running',
    );

    return sessionId;
  };

  const readTurns = (
    host: AcpEngine,
    sessionId: string,
  ): Pick<typeof turn.$inferSelect, 'status' | 'stopReason'>[] =>
    host.database
      .select({ status: turn.status, stopReason: turn.stopReason })
      .from(turn)
      .where(eq(turn.sessionId, sessionId))
      .all();

  it('cancelling a running Turn settles it immediately and drops late output', async () => {
    const { host, cancels } = await startCancellableEngine();
    const sessionId = await startTurn(host);
    await host.caller.session.cancel({ sessionId });
    await waitForAcpSessionIdle(host, sessionId);
    const page = await host.caller.feed.page({ sessionId, direction: 'tail' });
    expect({
      cancels,
      rows: page.rows.map((row) => ({
        kind: row.sessionUpdate,
        sameTurn: row.turnId === page.rows[0]?.turnId,
        content: 'content' in row ? row.content : undefined,
      })),
      turns: readTurns(host, sessionId),
    }).toMatchObject({
      cancels: [{ sessionId: 'owned-1' }],
      rows: [
        { kind: 'user_message', sameTurn: true },
        { kind: 'notice', sameTurn: true },
      ],
      turns: [{ status: 'ended', stopReason: 'cancelled' }],
    });
  });

  it('cancelling one Session leaves another Session on its own ACP process running in its own Checkout', async () => {
    const { host, cancels, openings, release } = await startCancellableEngine();
    const cancelledSession = await startTurn(host);

    const runningSession = await startTurn(host, {
      type: 'worktree',
      baseBranch: 'main',
    });

    await host.caller.session.cancel({ sessionId: cancelledSession });
    await waitForAcpSessionIdle(host, cancelledSession);

    const stillRunning = await waitForAcpSnapshot(
      host,
      runningSession,
      () => true,
    );

    release('owned-2');
    await waitForAcpSessionIdle(host, runningSession);
    expect({
      processes: host.agent.processes.length,
      distinctCheckouts: new Set(openings.map((opening) => opening.cwd)).size,
      cancels,
      stillRunning: stillRunning.state,
      turns: [
        readTurns(host, cancelledSession),
        readTurns(host, runningSession),
      ],
    }).toEqual({
      processes: 2,
      distinctCheckouts: 2,
      cancels: [{ sessionId: 'owned-1' }],
      stillRunning: 'running',
      turns: [
        [{ status: 'ended', stopReason: 'cancelled' }],
        [{ status: 'ended', stopReason: 'end_turn' }],
      ],
    });
  });
});
