import { SessionNewOutput } from '@repo/contracts';
import { OperationExecution } from '@repo/contracts/operations';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { closeTestSession } from '#mocks/close-session';
import { questionSteps } from '#mocks/elicitation-steps';
import { runOperation } from '#mocks/operations';
import { delegationJourney } from '#mocks/session-delegation';

const starterText = 'Delegate an outcome';
const sourceText = 'Produce the delegated result';

function gatedDelegation(question?: string) {
  const starterGate = Promise.withResolvers<void>();
  const sourceGate = Promise.withResolvers<void>();
  const journey = delegationJourney({
    replies: [
      {
        prompt: starterText,
        steps: [{ type: 'gate', waitFor: starterGate.promise }],
      },
      {
        prompt: sourceText,
        steps: [
          ...questionSteps(question),
          { type: 'gate', waitFor: sourceGate.promise },
        ],
      },
    ],
  });

  return { journey, starterGate, sourceGate };
}

async function delegate(
  { host, caller }: Awaited<ReturnType<typeof delegationJourney>>,
  followThrough: boolean,
): Promise<string> {
  await host.caller.session.prompt({
    sessionId: caller.sessionId,
    prompt: [{ type: 'text', text: starterText }],
  });
  const started = OperationExecution.parse(
    await runOperation(caller.caller.operations, {
      id: 'session.new',
      params: {
        ...emptySessionInput,
        followThrough,
        prompt: [{ type: 'text', text: sourceText }],
      },
    }),
  );
  const { sessionId } = SessionNewOutput.parse(started.result);
  await expect
    .poll(() => host.caller.session.get({ sessionId }))
    .toMatchObject({ activeTurnId: expect.any(String) });

  return sessionId;
}

it('queues an opted-in result behind the starter’s current Turn, then wakes that same Session', async () => {
  const { journey, starterGate, sourceGate } = gatedDelegation();
  const opened = await journey;
  const { host, caller } = opened;

  try {
    const sessionId = await delegate(opened, true);
    sourceGate.resolve();
    await expect
      .poll(
        async () =>
          (await host.caller.session.get({ sessionId: caller.sessionId }))
            .promptQueue.items,
      )
      .toHaveLength(1);
    starterGate.resolve();

    await expect
      .poll(async () => {
        const feed = await host.caller.feed.page({
          sessionId: caller.sessionId,
          direction: 'tail',
        });
        return feed.rows.filter(
          (row) =>
            row.sessionUpdate === 'prompt_message' &&
            row._meta.argo.sender.type === 'session' &&
            row._meta.argo.sender.delegatedResult,
        );
      })
      .toEqual([
        expect.objectContaining({
          content: [
            expect.objectContaining({
              text: expect.stringContaining(sessionId),
            }),
          ],
        }),
      ]);

    await host.caller.session.cancel({ sessionId: caller.sessionId });
  } finally {
    starterGate.resolve();
    sourceGate.resolve();
  }
}, 30_000);

it('revokes a pending result when the starter closes follow-through', async () => {
  const { journey, starterGate, sourceGate } = gatedDelegation();
  const opened = await journey;
  const { host, caller } = opened;

  try {
    const sessionId = await delegate(opened, true);
    await host.caller.session.closeFollowThrough({
      sessionId: caller.sessionId,
    });
    sourceGate.resolve();
    await waitForAcpSessionIdle(host, sessionId);
    starterGate.resolve();
    await waitForAcpSessionIdle(host, caller.sessionId);
    expect(
      (await host.caller.session.get({ sessionId: caller.sessionId }))
        .promptQueue.items,
    ).toEqual([]);
    const feed = await host.caller.feed.page({
      sessionId: caller.sessionId,
      direction: 'tail',
    });
    expect(
      feed.rows.filter((row) => row.sessionUpdate === 'prompt_message'),
    ).toEqual([]);
  } finally {
    starterGate.resolve();
    sourceGate.resolve();
  }
}, 30_000);

it('surfaces a source Elicitation on the starter and clears it after a source answer', async () => {
  const { journey, starterGate, sourceGate } = gatedDelegation('Which option?');
  const opened = await journey;
  const { host, caller } = opened;
  const reader = new AbortController();
  const stream = (
    await host
      .createCaller({ signal: reader.signal })
      .session.delegatedAttention({ sessionId: caller.sessionId })
  )[Symbol.asyncIterator]();
  try {
    expect((await stream.next()).value?.requests).toEqual([]);
    const sessionId = await delegate(opened, true);
    const pending = (await stream.next()).value?.requests[0];
    expect(pending).toMatchObject({ sessionId, kind: 'elicitation' });
    if (!pending)
      throw new Error('The starter did not see the source Elicitation');

    await host.caller.session.answerElicitation({
      sessionId,
      requestId: pending.requestId,
      action: 'accept',
      content: { answer: 'First' },
    });
    expect((await stream.next()).value?.requests).toEqual([]);
  } finally {
    reader.abort();
    await stream.return?.();
    starterGate.resolve();
    sourceGate.resolve();
  }
}, 30_000);

it('keeps a closed starter’s result queued and paused through a Server restart', async () => {
  const { journey, starterGate, sourceGate } = gatedDelegation();
  const opened = await journey;
  const { host, caller } = opened;
  const starter = { sessionId: caller.sessionId };

  try {
    await delegate(opened, true);
    starterGate.resolve();
    await waitForAcpSessionIdle(host, starter.sessionId);
    await closeTestSession(host, starter);
    sourceGate.resolve();

    await expect
      .poll(async () => (await host.caller.session.get(starter)).promptQueue)
      .toMatchObject({
        pauseReason: expect.any(String),
        items: [expect.anything()],
      });

    const queued = (await host.caller.session.get(starter)).promptQueue
      .items[0];
    await host.stop();
    const recovered = await startAcpEngine({
      steps: [],
      restartOver: host.home,
    });

    expect(
      (await recovered.caller.session.get(starter)).promptQueue,
    ).toMatchObject({ pauseReason: expect.any(String), items: [queued] });
    await recovered.caller.session.queue({
      ...starter,
      command: { action: 'resume' },
    });
    await waitForAcpSessionIdle(recovered, starter.sessionId);
    const page = await recovered.caller.feed.page({
      ...starter,
      direction: 'tail',
    });

    expect(
      page.rows.filter((row) => row.sessionUpdate === 'prompt_message'),
    ).toHaveLength(1);
  } finally {
    starterGate.resolve();
    sourceGate.resolve();
  }
}, 30_000);
