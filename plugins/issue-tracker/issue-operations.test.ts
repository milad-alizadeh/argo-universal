import { expect, it } from 'vitest';
import { issueOperations, type OperationsSource } from './issue-operations';
import type { IssueLink } from './tracker-storage';

// The handlers, over a storage that records what each one stored.
function registered(): ReturnType<typeof issueOperations> & {
  attached: IssueLink[];
} {
  const attached: IssueLink[] = [];

  const storage: OperationsSource['storage'] = {
    attachSession: async (link) => {
      attached.push(link);
    },
    detachSession: async (link) => drop(attached, link),
  };

  return { ...issueOperations({ storage }), attached };
}

const drop = (attached: IssueLink[], link: IssueLink): void => {
  const index = attached.findIndex((held) => held.sessionId === link.sessionId);

  if (index >= 0) attached.splice(index, 1);
};

const session = { sessionId: 'session-1', projectId: 'project-1' };

it('attaches the calling Session to the Issue in the Project core resolved', async () => {
  const plugin = registered();

  const result = await plugin.attach({ number: 1320 }, session);

  expect(plugin.attached).toEqual([
    { projectId: 'project-1', number: 1320, sessionId: 'session-1' },
  ]);
  expect(result).toMatchObject({ attached: true, number: 1320 });
});

it('detaches the Session it attached', async () => {
  const plugin = registered();

  await plugin.attach({ number: 1320 }, session);
  const result = await plugin.detach({ number: 1320 }, session);

  expect(plugin.attached).toEqual([]);
  expect(result).toMatchObject({ attached: false });
});

it.each([0, -3, 1.5])('refuses the Issue number %s', async (number) => {
  const plugin = registered();

  await expect(plugin.attach({ number }, session)).rejects.toThrow(
    'number must be a positive Issue number.',
  );
});
