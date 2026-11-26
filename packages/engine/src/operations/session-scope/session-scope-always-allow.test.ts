import { expect, it } from 'vitest';
import type { OperationCard, OperationConsent } from '../../sessions';
import type { SessionCaller } from '../session-tokens';
import {
  memoryGrants,
  newScope,
  operation,
  outcomeOf,
  ran,
  runs,
  sessionCaller,
} from './scope-fixtures';

// The cross-Project Schedule that asked on every call while one Session orchestrated others.
const scheduleForeign = operation('session.schedulePrompt', {
  sessionId: 'foreign',
  onceAt: 1_900_000_000_000,
  prompt: [{ type: 'text', text: 'Check the build' }],
});

const invoke = async (): Promise<never> => {
  throw ran;
};

type Asked = { cards: OperationCard[]; outcome: string };

type Asking = {
  scope: ReturnType<typeof newScope>;
  consent: OperationConsent;
  caller?: SessionCaller;
};

async function asking({
  scope,
  consent,
  caller = sessionCaller('caller'),
}: Asking): Promise<Asked> {
  const cards: OperationCard[] = [];

  const confirm = async (card: OperationCard): Promise<OperationConsent> => {
    cards.push(card);

    return consent;
  };

  const outcome = await scope
    .run({ caller, call: { confirm }, invoke }, scheduleForeign)
    .then(() => 'resolved', outcomeOf);

  return { cards, outcome };
}

it('offers Always allow on an Operation that asks', async () => {
  const { cards } = await asking({ scope: newScope(), consent: 'once' });

  expect(cards).toEqual([
    expect.objectContaining({ title: 'Schedule Prompt', alwaysAllow: true }),
  ]);
});

it('asks every time after Allow once', async () => {
  const scope = newScope();
  await asking({ scope, consent: 'once' });

  expect((await asking({ scope, consent: 'once' })).cards).toHaveLength(1);
});

it('runs without asking in the same Project after Always allow, and still asks in another Project', async () => {
  const grants = memoryGrants();
  const scope = newScope(undefined, grants);

  expect(await asking({ scope, consent: 'always' })).toMatchObject({
    outcome: runs,
  });
  expect(await asking({ scope, consent: 'once' })).toEqual({
    cards: [],
    outcome: runs,
  });
  expect(
    grants.granted({ projectId: 'p1', operationId: 'session.schedulePrompt' }),
  ).toBe(true);

  const elsewhere = sessionCaller('caller', 'p3');

  expect(
    (await asking({ scope, consent: 'once', caller: elsewhere })).cards,
  ).toHaveLength(1);
});
