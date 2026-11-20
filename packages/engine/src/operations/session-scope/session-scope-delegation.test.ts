import { expect, it } from 'vitest';
import {
  newScope,
  outcomeOf,
  promptTo,
  ran,
  runs,
  scoped,
  sessionCaller,
  startIn,
} from './scope-fixtures';

it('blocks starts past two levels of delegation', async () => {
  expect((await scoped(startIn('p1'), sessionCaller('started'))).outcome).toBe(
    runs,
  );
  expect((await scoped(startIn('p1'), sessionCaller('middle'))).outcome).toBe(
    'CONFLICT',
  );
  expect(
    (await scoped(promptTo('middle'), sessionCaller('started'))).outcome,
  ).toBe(runs);
  expect(
    (await scoped(promptTo('deep'), sessionCaller('middle'))).outcome,
  ).toBe('CONFLICT');
});

it('blocks a sixth running Agent, but not for a Session started without a Prompt', async () => {
  const full = sessionCaller('full');

  expect((await scoped(startIn('p1'), full)).outcome).toBe('CONFLICT');
  expect((await scoped(startIn('p1', []), full)).outcome).toBe(runs);
  expect((await scoped(startIn('p1'), sessionCaller('busy'))).outcome).toBe(
    runs,
  );
});

it('counts a start still being admitted against the running Agents until it settles', async () => {
  const scope = newScope();
  const held = Promise.withResolvers<never>();
  const busy = sessionCaller('busy');

  const first = scope
    .run(
      {
        caller: busy,
        call: { confirm: async () => {} },
        invoke: () => held.promise,
      },
      startIn('p1'),
    )
    .catch(outcomeOf);

  expect((await scoped(startIn('p1'), busy, scope)).outcome).toBe('CONFLICT');
  held.reject(ran);
  expect(await first).toBe(runs);
  expect((await scoped(startIn('p1'), busy, scope)).outcome).toBe(runs);
});

it('starts with the new Session id it reserved', async () => {
  expect((await scoped(startIn('p1'))).invoked).toEqual([
    {
      id: 'session.new',
      params: expect.objectContaining({ projectId: 'p1' }),
      start: { sessionId: 'new-session' },
    },
  ]);
});
