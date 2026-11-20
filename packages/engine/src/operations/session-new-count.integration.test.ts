import { expect, it } from 'vitest';
import { emptySessionInput } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { runOperation } from '#mocks/operations';
import {
  delegationJourney,
  holdSession,
  startDelegated,
} from '#mocks/session-delegation';

it('blocks starts above five running Agents and releases capacity when one Turn ends', async () => {
  const journey = await delegationJourney();
  const children: string[] = [];

  for (let index = 0; index < 5; index += 1) {
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
        prompt: [{ type: 'text', text: 'Sixth Agent' }],
      },
    }),
  ).rejects.toMatchObject({
    message: 'The Session delegation limit has been reached',
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
});
