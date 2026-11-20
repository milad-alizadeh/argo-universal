import { expect, it } from 'vitest';
import { operation, runs, scoped } from './scope-fixtures';

const work = [{ type: 'text', text: 'Work' }];

const newSession = 'session.new';

it('starts a Session in the caller’s Project, with its Agent, on the main Checkout, when session.new names only the Prompt', async () => {
  const { outcome, invoked } = await scoped(
    operation(newSession, { prompt: work }),
  );

  expect(outcome).toBe(runs);
  expect(invoked).toEqual([
    expect.objectContaining({
      id: newSession,
      params: {
        projectId: 'p1',
        agent: 'caller-agent',
        checkout: { type: 'main' },
        configOptions: [],
        prompt: work,
      },
    }),
  ]);
});

it('keeps the Project, Agent and Checkout session.new names', async () => {
  const params = {
    projectId: 'p1',
    agent: 'other-agent',
    checkout: { type: 'starter' },
    prompt: work,
  };

  const { invoked } = await scoped(operation(newSession, params));

  expect(invoked).toEqual([
    expect.objectContaining({
      params: { ...params, configOptions: [] },
    }),
  ]);
});

it('renames the calling Session when session.rename names no Session', async () => {
  const { outcome, invoked } = await scoped(
    operation('session.rename', { title: 'Renamed' }),
  );

  expect(outcome).toBe(runs);
  expect(invoked).toEqual([
    { id: 'session.rename', params: { sessionId: 'caller', title: 'Renamed' } },
  ]);
});
