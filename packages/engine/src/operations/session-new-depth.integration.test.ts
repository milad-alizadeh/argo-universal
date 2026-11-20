import { expect, it } from 'vitest';
import { emptySessionInput } from '#mocks/acp-engine';
import { runOperation } from '#mocks/operations';
import {
  delegationJourney,
  holdSession,
  startDelegated,
} from '#mocks/session-delegation';

it('allows two levels of Sessions and blocks a deeper start', async () => {
  const journey = await delegationJourney();
  const child = await startDelegated(journey);
  const grandchild = await startDelegated(journey, child);
  await holdSession(journey, grandchild.sessionId);

  const operation = {
    id: 'session.new' as const,
    params: {
      ...emptySessionInput,
      prompt: [{ type: 'text', text: 'Deep investigation' }],
    },
  };

  await expect(
    runOperation(grandchild.caller.operations, operation),
  ).rejects.toMatchObject({
    message: 'The Session delegation limit has been reached',
    data: { code: 'CONFLICT' },
  });
});
