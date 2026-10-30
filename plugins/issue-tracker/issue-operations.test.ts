import { expect, it } from 'vitest';
import {
  registerIssueOperations,
  type OperationsArgo,
  type OperationsSource,
} from './issue-operations';
import type { IssueLink } from './tracker-storage';

type Handler = Parameters<OperationsArgo['operations']['register']>[1];

type Registered = { attach: Handler; detach: Handler; attached: IssueLink[] };

// The handlers the Plugin registers, over a storage that records what each one stored.
function registered(): Registered {
  const handlers = new Map<string, Handler>();
  const attached: IssueLink[] = [];

  const storage: OperationsSource['storage'] = {
    attachSession: async (link) => {
      attached.push(link);
    },
    detachSession: async (link) => drop(attached, link),
  };

  const argo: OperationsArgo = {
    operations: {
      register: (name, handler) => handlers.set(name, handler),
    },
  };

  registerIssueOperations(argo, { storage });

  return {
    attach: registeredHandler(handlers, 'attach'),
    detach: registeredHandler(handlers, 'detach'),
    attached,
  };
}

const drop = (attached: IssueLink[], link: IssueLink): void => {
  const index = attached.findIndex((held) => held.sessionId === link.sessionId);

  if (index >= 0) attached.splice(index, 1);
};

const registeredHandler = (
  handlers: Map<string, Handler>,
  name: string,
): Handler => {
  const handler = handlers.get(name);

  if (!handler) throw new Error(`The Plugin registered no ${name} handler.`);

  return handler;
};

const session = { sessionId: 'session-1', projectId: 'project-1' };

it("attaches the calling Session to the Issue in the caller's Project", async () => {
  const plugin = registered();

  const result = await plugin.attach({ number: 1320 }, session);

  expect(plugin.attached).toEqual([
    { projectId: 'project-1', number: 1320, sessionId: 'session-1' },
  ]);
  expect(result).toMatchObject({ attached: true, number: 1320 });
});

it('attaches in the Project the caller names instead of its own', async () => {
  const plugin = registered();

  await plugin.attach({ number: 7, projectId: 'project-2' }, session);

  expect(plugin.attached[0]?.projectId).toBe('project-2');
});

it('detaches the Session it attached', async () => {
  const plugin = registered();

  await plugin.attach({ number: 1320 }, session);
  const result = await plugin.detach({ number: 1320 }, session);

  expect(plugin.attached).toEqual([]);
  expect(result).toMatchObject({ attached: false });
});

it('refuses a run with no Session of its own', async () => {
  const plugin = registered();

  await expect(plugin.attach({ number: 1320 }, {})).rejects.toThrow(
    'Only a Session can attach an Issue to itself.',
  );
});

it('refuses a run with no Project to attach the Issue in', async () => {
  const plugin = registered();

  await expect(
    plugin.attach({ number: 1320 }, { sessionId: 'session-1' }),
  ).rejects.toThrow('No Project to attach the Issue in.');
});

it.each([0, -3, 1.5])('refuses the Issue number %s', async (number) => {
  const plugin = registered();

  await expect(plugin.attach({ number }, session)).rejects.toThrow(
    'number must be a positive Issue number.',
  );
});
