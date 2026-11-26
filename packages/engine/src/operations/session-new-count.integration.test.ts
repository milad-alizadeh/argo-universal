import { expect, it } from 'vitest';
import { emptySessionInput } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { runOperation } from '#mocks/operations';
import {
  delegationJourney,
  holdSession,
  startDelegated,
} from '#mocks/session-delegation';

it('blocks starts above ten running Agents and releases capacity when one Turn ends', async () => {
  const journey = await delegationJourney();
  const children: string[] = [];

  for (let index = 0; index < 10; index += 1) {
    const child = await startDelegated(journey);
    children.push(child.sessionId);
    await holdSession(journey, child.sessionId);
  }

  await holdSession(journey, journey.caller.sessionId);

  await expect(
    runOperation(journey.caller.caller.operations, {
      id: 'session.new',
      params: {
        ...emptySessionInput,
        prompt: [{ type: 'text', text: 'Eleventh Agent' }],
      },
    }),
  ).rejects.toMatchObject({
    message: expect.stringMatching(
      /^The Session delegation limit has been reached: /,
    ),
    data: { code: 'CONFLICT' },
  });
  const first = children[0];

  if (!first) throw new Error('Missing first Agent');
  await journey.host.caller.session.cancel({ sessionId: first });
  await waitForAcpSessionIdle(journey.host, first);

  const replacement = await startDelegated(journey);
  expect(
    await journey.host.caller.session.get({ sessionId: replacement.sessionId }),
  ).toMatchObject({ startedBySessionId: journey.caller.sessionId });
}, 30_000);

it('takes a Prompt to a running started Session while ten run, since it steers or queues there', async () => {
  const journey = await delegationJourney();
  const children: string[] = [];

  for (let index = 0; index < 10; index += 1) {
    const child = await startDelegated(journey);
    children.push(child.sessionId);
    await holdSession(journey, child.sessionId);
  }

  await holdSession(journey, journey.caller.sessionId);
  const [running] = children;

  if (!running) throw new Error('Missing running Agent');

  const landed = await runOperation(journey.caller.caller.operations, {
    id: 'session.prompt',
    params: {
      sessionId: running,
      prompt: [{ type: 'text', text: 'Steer this' }],
      followThrough: false,
    },
  });

  expect(landed).toEqual({
    kind: 'operation_execution',
    id: expect.stringMatching(/^turn:/),
    status: 'still_running',
    result: {
      sessionId: running,
      status: 'queued',
      messageId: expect.any(String),
      notSteered: null,
    },
  });
}, 30_000);
