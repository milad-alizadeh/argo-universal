import type {
  CancelNotification,
  NewSessionRequest,
} from '@agentclientprotocol/sdk';
import type { SessionNewInput } from '@repo/contracts';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle, waitForAcpSnapshot } from '#mocks/acp-feed';

type AcpEngine = Awaited<ReturnType<typeof startAcpEngine>>;

const finalText = 'Final output after cancel';

const startCancellableEngine = async (): Promise<{
  host: AcpEngine;
  cancels: CancelNotification[];
  openings: NewSessionRequest[];
  release: (acpSessionId: string) => void;
}> => {
  const cancels: CancelNotification[] = [];
  const openings: NewSessionRequest[] = [];
  const finishSibling = Promise.withResolvers<void>();
  const host = await startAcpEngine({
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
            until: sessionId === 'owned-2' ? finishSibling.promise : undefined,
          },
          {
            type: 'update' as const,
            update: {
              sessionUpdate: 'agent_message_chunk' as const,
              content: {
                type: 'text' as const,
                text: `${finalText} ${sessionId}`,
              },
            },
          },
        ],
      })),
    },
    notifications: { 'session/cancel': { requests: cancels } },
  });
  return { host, cancels, openings, release: () => finishSibling.resolve() };
};

const startTurn = async (
  host: AcpEngine,
  checkout: SessionNewInput['checkout'] = emptySessionInput.checkout,
): Promise<string> => {
  const { sessionId } = await host.caller.session.new({
    ...emptySessionInput,
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

const readTurns = (host: AcpEngine, sessionId: string): unknown =>
  host.database.$client
    .prepare('SELECT status, stop_reason FROM turn WHERE session_id = ?')
    .all(sessionId);

it('cancelling a running Turn keeps its prompt observed until the final output and completion arrive', async () => {
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
      {
        kind: 'agent_message',
        sameTurn: true,
        content: [{ text: `${finalText} owned-1` }],
      },
    ],
    turns: [{ status: 'ended', stop_reason: 'cancelled' }],
  });
});

it('cancelling one Session leaves another Session on the same ACP connection running in its own Checkout', async () => {
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
    turns: [readTurns(host, cancelledSession), readTurns(host, runningSession)],
  }).toEqual({
    processes: 1,
    distinctCheckouts: 2,
    cancels: [{ sessionId: 'owned-1' }],
    stillRunning: 'running',
    turns: [
      [{ status: 'ended', stop_reason: 'cancelled' }],
      [{ status: 'ended', stop_reason: 'end_turn' }],
    ],
  });
});
