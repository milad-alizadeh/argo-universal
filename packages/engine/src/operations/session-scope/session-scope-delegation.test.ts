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

it('steers or queues onto a running Session the caller started, even with five of its Agents running', async () => {
  expect(
    (await scoped(promptTo('full-agent-0'), sessionCaller('full'))).outcome,
  ).toBe(runs);
});

it('says what the running limit is, what holds it and how to free it', async () => {
  const scope = newScope();
  const refusal = await scope
    .run(
      {
        caller: sessionCaller('full'),
        call: { confirm: async () => {} },
        invoke: async () => {
          throw ran;
        },
      },
      promptTo('full-idle'),
    )
    .catch((cause: unknown) => cause);

  expect(refusal).toMatchObject({ code: 'CONFLICT' });
  expect(String((refusal as Error).message)).toMatch(
    /at most 5 .*full-agent-0.*full-agent-4.*session\.cancel/s,
  );
});
