import { expect, it } from 'vitest';
import type { GrantKey, OperationGrants } from '../../agent-access';
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
  type ScopedOperation,
} from './scope-fixtures';

// A cross-Project Schedule, the call that asked on every run while one Session orchestrated others.
const scheduleIn = (sessionId: string): ScopedOperation =>
  operation('session.schedulePrompt', {
    sessionId,
    onceAt: 1_900_000_000_000,
    prompt: [{ type: 'text', text: 'Check the build' }],
  });

const scheduleForeign = scheduleIn('foreign');

const granted: GrantKey = {
  projectId: 'p1',
  operationId: 'session.schedulePrompt',
  targetProjectId: 'p2',
};

const invoke = async (): Promise<never> => {
  throw ran;
};

type Asked = { cards: OperationCard[]; outcome: string };

type Asking = {
  scope: ReturnType<typeof newScope>;
  consent: OperationConsent;
  caller?: SessionCaller;
  call?: ScopedOperation;
  canConfirm?: boolean;
};

async function asking({
  scope,
  consent,
  caller = sessionCaller('caller'),
  call = scheduleForeign,
  canConfirm = true,
}: Asking): Promise<Asked> {
  const cards: OperationCard[] = [];

  const confirm = async (card: OperationCard): Promise<OperationConsent> => {
    cards.push(card);

    return consent;
  };

  const outcome = await scope
    .run({ caller, call: { confirm, canConfirm }, invoke }, call)
    .then(() => 'resolved', outcomeOf);

  return { cards, outcome };
}

// A scope whose grants already hold Always allow for Schedules from p1 into p2.
async function grantedScope(): Promise<ReturnType<typeof newScope>> {
  const grants = memoryGrants();
  await grants.grant(granted);

  return newScope(undefined, grants);
}

it('offers Always allow on a Schedule, and says what it covers', async () => {
  const { cards } = await asking({ scope: newScope(), consent: 'once' });

  expect(cards).toEqual([
    expect.objectContaining({ title: 'Schedule Prompt', alwaysAllow: true }),
  ]);
  expect(cards[0]?.description).toContain(
    'Always allow lets Sessions started in Project p1 run Schedule Prompt in Project p2 without asking, until you revoke it in Settings › Agent access.',
  );
});

it('never offers Always allow on an Operation that does not opt in, and asks every time', async () => {
  const grants = memoryGrants();
  const scope = newScope(undefined, grants);
  const remove = operation('agent.remove', { id: 'mock' });

  const first = await asking({ scope, consent: 'always', call: remove });
  const second = await asking({ scope, consent: 'once', call: remove });

  expect(first.cards).toEqual([
    expect.not.objectContaining({ alwaysAllow: true }),
  ]);
  expect(second.cards).toHaveLength(1);
});

it('asks every time after Allow once', async () => {
  const scope = newScope();
  await asking({ scope, consent: 'once' });

  expect((await asking({ scope, consent: 'once' })).cards).toHaveLength(1);
});

it('runs without asking after Always allow, keyed by the caller and target Projects', async () => {
  const grants = memoryGrants();
  const scope = newScope(undefined, grants);

  expect(await asking({ scope, consent: 'always' })).toMatchObject({
    outcome: runs,
  });
  expect(grants.granted(granted)).toBe(true);
  expect(await asking({ scope, consent: 'once' })).toEqual({
    cards: [],
    outcome: runs,
  });
});

it('still asks for the same Operation into another target Project', async () => {
  const scope = await grantedScope();

  expect(
    (await asking({ scope, consent: 'once', call: scheduleIn('far') })).cards,
  ).toHaveLength(1);
});

it('does not let a Session whose chain starts in another Project use the grant', async () => {
  const scope = await grantedScope();
  const imported = sessionCaller('imported');

  const asked = await asking({ scope, consent: 'once', caller: imported });

  expect(asked.cards).toEqual([
    expect.not.objectContaining({ alwaysAllow: true }),
  ]);
});

it('still needs the calling Session’s active Turn for a granted call', async () => {
  const scope = await grantedScope();

  expect(
    (await asking({ scope, consent: 'once', canConfirm: false })).cards,
  ).toHaveLength(1);
});

it('runs the call as Allow once when the grant cannot be written', async () => {
  const failing: OperationGrants = {
    ...memoryGrants(),
    grant: async () => {
      throw new Error('The database is locked');
    },
  };

  const scope = newScope(undefined, failing);

  expect(await asking({ scope, consent: 'always' })).toMatchObject({
    outcome: runs,
  });
  expect(await asking({ scope, consent: 'once' })).toMatchObject({
    cards: [expect.objectContaining({ alwaysAllow: true })],
  });
});
