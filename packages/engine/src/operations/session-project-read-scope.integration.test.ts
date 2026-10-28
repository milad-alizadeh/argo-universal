import { expect, it } from 'vitest';
import { operationCaller } from '#mocks/operations';
import {
  addOtherProject,
  openAccessSession,
  sessionAccessHost,
} from '#mocks/session-access';
import { sessionReadScope } from '#mocks/session-read-scope';

const listOperationId = 'session.list';

const projectBranchesId = 'project.listBranches';

it('limits a Session list to its caller Project and refuses an explicit foreign Project', async () => {
  const fixture = await sessionAccessHost();
  const otherId = await addOtherProject(fixture.host);
  const caller = await openAccessSession(fixture, 'Caller');
  const sibling = await openAccessSession(fixture, 'Sibling');
  const foreign = await openAccessSession(fixture, 'Foreign', otherId);

  expect(
    await caller.caller.operations.run.mutate({
      id: listOperationId,
      params: {},
    }),
  ).toMatchObject({
    sessions: expect.arrayContaining([
      expect.objectContaining({ sessionId: caller.sessionId }),
      expect.objectContaining({ sessionId: sibling.sessionId }),
    ]),
  });
  expect(
    await caller.caller.operations.run.mutate({
      id: listOperationId,
      params: {},
    }),
  ).not.toMatchObject({
    sessions: expect.arrayContaining([
      expect.objectContaining({ sessionId: foreign.sessionId }),
    ]),
  });
  await expect(
    caller.caller.operations.run.mutate({
      id: listOperationId,
      params: { projectId: otherId },
    }),
  ).rejects.toMatchObject({
    data: { code: 'FORBIDDEN' },
    message: expect.stringContaining('Project'),
  });
  expect((await fixture.host.caller.session.list({})).sessions).toContainEqual(
    expect.objectContaining({ sessionId: foreign.sessionId }),
  );
  const user = await operationCaller(fixture.host);

  expect(
    await user.operations.run.mutate({
      id: listOperationId,
      params: { projectId: otherId },
    }),
  ).toMatchObject({
    sessions: [expect.objectContaining({ sessionId: foreign.sessionId })],
    nextCursor: null,
  });
}, 30_000);

it('scopes Project branch reads while keeping user access to another Project', async () => {
  const { calling, otherId, user } = await sessionReadScope();

  expect(
    await calling.caller.operations.run.mutate({
      id: projectBranchesId,
      params: { projectId: 'project-1' },
    }),
  ).toMatchObject({ currentBranch: 'main' });
  await expect(
    calling.caller.operations.run.mutate({
      id: projectBranchesId,
      params: { projectId: otherId },
    }),
  ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
  expect(
    await user.operations.run.mutate({
      id: projectBranchesId,
      params: { projectId: otherId },
    }),
  ).toMatchObject({ currentBranch: 'main' });
}, 30_000);
