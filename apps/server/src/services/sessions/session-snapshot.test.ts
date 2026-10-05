import { afterAll, expect, it } from 'vitest';
import { createActor, type StateValue } from 'xstate';
import { openTestDatabase } from '../../../mocks/database';
import { sessionMachine } from './session-machine';
import { toSessionSnapshot } from './session-snapshot';

const { database, remove } = openTestDatabase();
afterAll(remove);
const context = createActor(sessionMachine, {
  input: { database, kind: 'existing', sessionId: 'session-1' },
}).getSnapshot().context;
const rows: [StateValue, string][] = [
  ['entering', 'idle'],
  ['creating', 'idle'],
  ['loading', 'idle'],
  [{ open: { live: 'starting' } }, 'idle'],
  [{ open: { live: 'idle' } }, 'idle'],
  [{ open: { live: { running: 'working' } } }, 'running'],
  [{ open: { live: { running: 'awaitingPermission' } } }, 'requires_action'],
  [{ open: { live: { running: 'awaitingElicitation' } } }, 'requires_action'],
  [{ open: { live: 'cancelling' } }, 'running'],
  [{ open: { live: 'closing' } }, 'idle'],
  [{ open: 'recovering' }, 'idle'],
  [{ open: 'flushing' }, 'idle'],
  ['closed', 'idle'],
];
it.each(rows)('maps %j to %s', (value, state) => {
  const snapshot = sessionMachine.resolveState({ value, context });
  expect(
    toSessionSnapshot(snapshot, { context: { epoch: 2, maxRevision: 7 } }),
  ).toEqual({
    state,
    activeTurnId: null,
    usage: null,
    pendingPermission: null,
    pendingElicitation: null,
    configOptions: [],
    epoch: 2,
    maxRevision: 7,
  });
});

it('projects the live context and the Feed revision without changing either', () => {
  const permission = {
    toolCallId: 'tool-1',
    title: 'Run a command',
    options: [],
  };
  const elicitation = {
    mode: 'form' as const,
    message: 'Which file?',
    requestedSchema: { properties: {} },
  };
  const config = {
    configId: 'mode',
    name: 'Mode',
    type: 'select' as const,
    currentValue: 'plan',
    options: [],
  };
  const usage = { used: 40, size: 100 };
  const snapshot = sessionMachine.resolveState({
    value: { open: { live: { running: 'awaitingPermission' } } },
    context: {
      ...context,
      activeTurnId: 'turn-1',
      usage,
      permissionQueue: [permission, { ...permission, toolCallId: 'tool-2' }],
      pendingElicitation: elicitation,
      configOptions: [config],
    },
  });
  expect(
    toSessionSnapshot(snapshot, { context: { epoch: 3, maxRevision: 9 } }),
  ).toEqual({
    state: 'requires_action',
    activeTurnId: 'turn-1',
    usage,
    pendingPermission: permission,
    pendingElicitation: elicitation,
    configOptions: [config],
    epoch: 3,
    maxRevision: 9,
  });
  expect(snapshot.context.permissionQueue).toHaveLength(2);
});
