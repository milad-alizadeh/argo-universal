import type { PromptRequest } from '@agentclientprotocol/sdk';
import { SessionPromptOutput } from '@repo/contracts';
import { OperationExecution } from '@repo/contracts/operations';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { runOperation } from '#mocks/operations';
import {
  delegationJourney,
  holdSession,
  startDelegated,
  type DelegationJourney,
} from '#mocks/session-delegation';
import { steeringScenario } from '#mocks/voice-agent';

const held = 'Keep working';

const extra = 'Also check the logs';

type BusyTarget = {
  journey: DelegationJourney;
  sessionId: string;
  release: () => void;
  // The Prompts the Agent took for `extra` as Turns of their own.
  extraTurns: PromptRequest[];
  steered: Promise<unknown>;
  prompt: () => Promise<OperationExecution>;
  wait: (id: string) => Promise<OperationExecution>;
};

// A Session whose Turn runs until released, and a caller Session that prompts it.
async function busyTarget(steering?: boolean | 'refused'): Promise<BusyTarget> {
  const release = Promise.withResolvers<void>();
  const steered = Promise.withResolvers<unknown>();
  const extraTurns: PromptRequest[] = [];

  const journey = await delegationJourney({
    replies: [
      { prompt: held, steps: [{ type: 'gate', waitFor: release.promise }] },
      { prompt: extra, requests: extraTurns },
    ],
    agent: steeringScenario(steered, steering),
  });

  const { sessionId } = await startDelegated(journey);

  await holdSession(journey, sessionId);
  const { operations } = journey.caller.caller;

  return {
    journey,
    sessionId,
    release: () => release.resolve(),
    extraTurns,
    steered: steered.promise,
    prompt: async () =>
      OperationExecution.parse(
        await runOperation(operations, {
          id: 'session.prompt',
          params: { sessionId, prompt: [{ type: 'text', text: extra }] },
        }),
      ),
    wait: async (id) => operations.wait.mutate({ id }),
  };
}

// The Prompt's own answer, carried in the execution beside the Session it went to.
const promptResult = ({ result }: OperationExecution): SessionPromptOutput =>
  SessionPromptOutput.parse(SessionIdAnd.parse(result).answer);

const SessionIdAnd = z
  .looseObject({ sessionId: z.string() })
  .transform(({ sessionId: _sessionId, ...answer }) => ({ answer }));

it('queues a Session Prompt behind a running Turn its Agent cannot steer, and a wait follows it through its own Turn', async () => {
  const busy = await busyTarget();
  const queued = await busy.prompt();

  expect(queued).toMatchObject({
    status: 'still_running',
    result: {
      sessionId: busy.sessionId,
      status: 'queued',
      notSteered: null,
      messageId: expect.any(String),
    },
  });
  expect(busy.extraTurns).toHaveLength(0);

  const waited = busy.wait(queued.id);
  busy.release();
  const ended = await waited;

  expect(ended).toMatchObject({
    status: 'settled',
    turn: { sessionId: busy.sessionId, status: 'ended' },
  });
  expect(busy.extraTurns).toHaveLength(1);
  expect(
    await busy.journey.host.caller.feed.row({
      sessionId: busy.sessionId,
      id: promptResult(queued).messageId ?? '',
    }),
  ).toMatchObject({
    sessionUpdate: 'prompt_message',
    turnId: ended.turn?.id,
    content: [{ type: 'text', text: extra }],
    _meta: { argo: { sender: { type: 'session' } } },
  });
}, 30_000);

it('steers a Session Prompt into the running Turn when its Agent supports steering, and a wait follows that Turn', async () => {
  const busy = await busyTarget(true);
  const steered = await busy.prompt();

  expect(steered).toMatchObject({
    status: 'still_running',
    result: {
      status: 'steered',
      messageId: expect.stringContaining(':steer:'),
    },
    turn: { sessionId: busy.sessionId, status: 'running' },
  });
  expect(JSON.stringify(await busy.steered)).toContain(extra);

  const waited = busy.wait(steered.id);
  busy.release();

  expect(await waited).toMatchObject({
    status: 'settled',
    turn: { id: steered.turn?.id, status: 'ended' },
  });
  expect(busy.extraTurns).toHaveLength(0);
}, 30_000);

it('queues a Session Prompt the Agent refused to be steered with, and says why', async () => {
  const busy = await busyTarget('refused');

  expect(await busy.prompt()).toMatchObject({
    result: {
      status: 'queued',
      notSteered: 'The Agent did not accept steering; your Prompt was kept',
    },
  });

  busy.release();
  await expect.poll(() => busy.extraTurns.length).toBe(1);
}, 30_000);
