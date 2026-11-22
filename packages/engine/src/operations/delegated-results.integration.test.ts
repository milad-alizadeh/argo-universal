import type { PromptRequest } from '@agentclientprotocol/sdk';
import { SessionNewOutput } from '@repo/contracts';
import { OperationExecution } from '@repo/contracts/operations';
import type { ScriptedStep } from '@repo/mocks/agent/scripted-scenario';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { closeTestSession } from '#mocks/close-session';
import { permissionSteps, steeringScenario } from '#mocks/conversation-agent';
import { questionSteps } from '#mocks/elicitation-steps';
import { runOperation } from '#mocks/operations';
import { delegationJourney } from '#mocks/session-delegation';
import { FeedRowsJob } from '../feed';
import { closeFollowThrough } from '../sessions/orchestration/result-store';
import type { WriterJob } from '../storage';
import { writeJobs } from '../storage';

const starterText = 'Delegate an outcome';

const sourceText = 'Produce the delegated result';

const sourceExcerpt = 'Review complete. No findings.';

type GatedDelegation = {
  journey: ReturnType<typeof delegationJourney>;
  starterGate: PromiseWithResolvers<void>;
  sourceGate: PromiseWithResolvers<void>;
};

type GatedDelegationOptions = Pick<
  NonNullable<Parameters<typeof delegationJourney>[0]>,
  'agent' | 'requests'
> & { inputSteps?: ScriptedStep[] };

function gatedDelegation({
  requests,
  agent,
  inputSteps = [],
}: GatedDelegationOptions = {}): GatedDelegation {
  const starterGate = Promise.withResolvers<void>();
  const sourceGate = Promise.withResolvers<void>();

  const journey = delegationJourney({
    requests,
    agent,
    replies: [
      {
        prompt: starterText,
        steps: [{ type: 'gate', waitFor: starterGate.promise }],
      },
      {
        prompt: sourceText,
        steps: [
          ...inputSteps,
          { type: 'gate', waitFor: sourceGate.promise },
          {
            type: 'update',
            update: {
              sessionUpdate: 'agent_message_chunk',
              messageId: 'delegated-review',
              content: { type: 'text', text: sourceExcerpt },
            },
          },
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
    const source = await host.caller.session.get({ sessionId });
    const title = source.title || 'Started Session';
    sourceGate.resolve();
    await expect
      .poll(
        async () =>
          (await host.caller.session.get({ sessionId: caller.sessionId }))
            .promptQueue.items,
      )
      .toEqual([
        expect.objectContaining({
          sender: expect.objectContaining({
            resultPreview: { title, excerpt: sourceExcerpt },
          }),
        }),
      ]);
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

type DelegationHost = Awaited<ReturnType<typeof delegationJourney>>['host'];

function writesResult(job: WriterJob, starterId: string): boolean {
  if (!(job instanceof FeedRowsJob)) return false;

  const { sessionId, rows } = job.queuedFeedRows();

  return (
    sessionId === starterId &&
    rows.some(
      (row) =>
        row.sessionUpdate === 'prompt_message' &&
        row._meta.argo.sender.type === 'session' &&
        Boolean(row._meta.argo.sender.delegatedResult),
    )
  );
}

type FeedCommitIntercept = { closed: Promise<void>; stop: () => void };

function closeDuringFeedCommit(
  host: DelegationHost,
  starterId: string,
): FeedCommitIntercept {
  const closed = Promise.withResolvers<void>();

  const subscription = host.databaseWriter.on('writer.queued', ({ jobs }) => {
    if (!jobs.some((job) => writesResult(job, starterId))) return;

    subscription.unsubscribe();
    // Commit a workflow close before the waiting submission can observe its Feed commit.
    writeJobs(host.database, [closeFollowThrough(starterId)]);
    closed.resolve();
  });

  return { closed: closed.promise, stop: () => subscription.unsubscribe() };
}

it('does not dispatch a result revoked during its Feed commit', async () => {
  const requests: PromptRequest[] = [];

  const { journey, starterGate, sourceGate } = gatedDelegation({ requests });

  const opened = await journey;
  const { host, caller } = opened;
  const starter = { sessionId: caller.sessionId };
  const intercept = closeDuringFeedCommit(host, starter.sessionId);

  try {
    await delegate(opened, true);
    sourceGate.resolve();
    await expect
      .poll(
        async () =>
          (await host.caller.session.get(starter)).promptQueue.items.length,
      )
      .toBe(1);

    const requestsBefore = requests.length;
    starterGate.resolve();
    await intercept.closed;
    await waitForAcpSessionIdle(host, starter.sessionId);

    expect(requests).toHaveLength(requestsBefore);
  } finally {
    intercept.stop();
    starterGate.resolve();
    sourceGate.resolve();
  }
}, 30_000);

it('delivers the source result after the starter answers a delegated Elicitation', async () => {
  const { journey, starterGate, sourceGate } = gatedDelegation({
    inputSteps: questionSteps('Which option?'),
  });

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

    await runOperation(caller.caller.operations, {
      id: 'session.prompt',
      params: {
        sessionId,
        prompt: [{ type: 'text', text: 'Review the first option.' }],
      },
    });
    expect((await stream.next()).value?.requests).toEqual([]);

    sourceGate.resolve();
    await expect
      .poll(async () => {
        const { promptQueue } = await host.caller.session.get({
          sessionId: caller.sessionId,
        });

        return promptQueue.items;
      })
      .toContainEqual(
        expect.objectContaining({
          sender: expect.objectContaining({
            resultPreview: expect.objectContaining({ excerpt: sourceExcerpt }),
          }),
        }),
      );
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

it('steers a source Elicitation once into the starter’s running Turn', async () => {
  const steered = Promise.withResolvers<unknown>();
  const question = 'Which option should I review?';

  const { journey, starterGate, sourceGate } = gatedDelegation({
    inputSteps: questionSteps(question),
    agent: steeringScenario(steered, true),
  });

  const opened = await journey;

  try {
    const sessionId = await delegate(opened, true);
    let received: unknown;
    void steered.promise.then((request) => (received = request));
    await expect
      .poll(() => JSON.stringify(received ?? null))
      .toContain(question);
    expect(JSON.stringify(received ?? null)).toContain(sessionId);
    expect(JSON.stringify(received ?? null)).toContain('elicitation');

    const { host, caller } = opened;
    await expect
      .poll(async () => {
        const feed = await host.caller.feed.page({
          sessionId: caller.sessionId,
          direction: 'tail',
        });

        return feed.rows.filter(
          (row) =>
            row.sessionUpdate === 'prompt_message' &&
            JSON.stringify(row.content).includes(question),
        );
      })
      .toHaveLength(1);
  } finally {
    starterGate.resolve();
    sourceGate.resolve();
  }
}, 30_000);

it('queues each pending request when the starter’s Agent cannot steer', async () => {
  const title = 'Publish the reviewed report';
  const question = 'Which recipient should receive the report?';

  const { journey, starterGate, sourceGate } = gatedDelegation({
    inputSteps: [
      {
        type: 'parallel',
        steps: [...permissionSteps(title), ...questionSteps(question)],
      },
    ],
  });

  const opened = await journey;
  const { host, caller } = opened;

  try {
    const sessionId = await delegate(opened, true);

    const queued = async (): Promise<string[]> => {
      const { promptQueue } = await host.caller.session.get({
        sessionId: caller.sessionId,
      });

      return promptQueue.items.flatMap(({ prompt }) =>
        prompt.flatMap((block) => (block.type === 'text' ? [block.text] : [])),
      );
    };

    await expect.poll(queued).toHaveLength(2);
    expect(await queued()).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          JSON.stringify({
            sourceSessionId: sessionId,
            kind: 'permission',
            detail: title,
          }),
        ),
        expect.stringContaining(
          JSON.stringify({
            sourceSessionId: sessionId,
            kind: 'elicitation',
            detail: question,
          }),
        ),
      ]),
    );
  } finally {
    starterGate.resolve();
    sourceGate.resolve();
  }
}, 30_000);
