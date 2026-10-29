import { operations } from '@repo/contracts/operations';
import { expect, it, onTestFinished } from 'vitest';
import { z } from 'zod';
import { operationCaller, runOperation } from '#mocks/operations';
import { startProjectTestHost } from '#mocks/project-host';

const projectList = operations['project.list'];

it('refuses a user-token result that does not match its Operation result', async () => {
  const host = await startProjectTestHost();
  const user = await operationCaller(host);
  const { result } = projectList;
  // The registry entry is the edge here: no real reader returns a malformed Project.
  Object.assign(projectList, { result: z.array(z.never()) });
  onTestFinished(() => {
    Object.assign(projectList, { result });
  });

  await expect(
    runOperation(user.operations, { id: 'project.list', params: {} }),
  ).rejects.toMatchObject({ data: { code: 'INTERNAL_SERVER_ERROR' } });
});
