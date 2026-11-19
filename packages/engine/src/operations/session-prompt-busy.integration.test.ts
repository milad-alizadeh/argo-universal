import { OperationExecution } from '@repo/contracts/operations';
import { expect, it } from 'vitest';
import { runOperation } from '#mocks/operations';
import {
  delegationJourney,
  holdSession,
  startDelegated,
} from '#mocks/session-delegation';

it('takes a Session Prompt to a Session whose Turn is running instead of refusing it', async () => {
  const journey = await delegationJourney();
  const target = await startDelegated(journey);
  await holdSession(journey, target.sessionId);

  const sent = runOperation(journey.caller.caller.operations, {
    id: 'session.prompt',
    params: {
      sessionId: target.sessionId,
      prompt: [{ type: 'text', text: 'Also check the logs' }],
    },
  }).then((result) => OperationExecution.parse(result));

  await expect(sent).resolves.toBeDefined();
}, 30_000);
