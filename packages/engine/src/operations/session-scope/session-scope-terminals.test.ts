import { expect, it } from 'vitest';
import { operation, runs, scoped } from './scope-fixtures';

const send = 'terminal.send';

const shell = 'my-shell';

it('types into a Run for the calling Session when terminal.send names no Session', async () => {
  const { outcome, invoked } = await scoped(
    operation(send, { name: 'web', input: 'r' }),
  );

  expect(outcome).toBe(runs);
  expect(invoked).toEqual([
    {
      id: send,
      params: { sessionId: 'caller', name: 'web', input: 'r' },
    },
  ]);
});

it('refuses a Session that types into a Terminal the person opened', async () => {
  const { outcome, invoked } = await scoped(
    operation(send, { name: shell, input: 'ls\r' }),
  );

  expect(outcome).toBe('FORBIDDEN');
  expect(invoked).toEqual([]);
});

it('lets a Session read a Terminal the person opened', async () => {
  const { outcome } = await scoped(operation('terminal.read', { name: shell }));

  expect(outcome).toBe(runs);
});
