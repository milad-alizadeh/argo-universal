import type { OperationId } from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { expect, it } from 'vitest';
import { sessionReadScope } from '#mocks/session-read-scope';

const reviewPath = 'review.txt';

type TargetRead = {
  id: OperationId;
  params: Record<string, Json>;
  expected: (projectId: string) => object;
};

const targetReads: TargetRead[] = [
  {
    id: 'session.get',
    params: {},
    expected: (projectId) => ({ projectId, state: 'idle' }),
  },
  {
    id: 'session.feed',
    params: { limit: 1 },
    expected: () => ({
      messages: [{ content: [{ type: 'text', text: 'Third result' }] }],
      nextCursor: expect.any(Number),
    }),
  },
  {
    id: 'session.changes',
    params: { limit: 1 },
    expected: () => ({ files: [{ path: reviewPath }], nextCursor: 1 }),
  },
  {
    id: 'session.diff',
    params: { path: reviewPath },
    expected: () => ({
      file: { path: reviewPath },
      patch: { text: expect.stringContaining('+one') },
    }),
  },
  { id: 'session.listAgents', params: {}, expected: () => [] },
  {
    id: 'session.listShells',
    params: {},
    expected: () => [
      {
        toolCallId: 'environment',
        status: 'exited',
        exitCode: 0,
        canStop: false,
      },
    ],
  },
  {
    id: 'session.listBranches',
    params: {},
    expected: () => ({
      branches: expect.arrayContaining([
        expect.objectContaining({ name: 'main' }),
      ]),
    }),
  },
];

it.each(targetReads)(
  'reads $id in scope and requires an active Turn to confirm foreign access while preserving user access',
  async ({ id, params, expected }) => {
    const { calling, target, foreign, otherId, user } =
      await sessionReadScope();

    expect(
      await calling.caller.operations.run.mutate({
        id,
        params: { ...params, sessionId: target.sessionId },
      }),
    ).toMatchObject(expected('project-1'));
    await expect(
      calling.caller.operations.run.mutate({
        id,
        params: { ...params, sessionId: foreign.sessionId },
      }),
    ).rejects.toMatchObject({
      data: { code: 'CONFLICT' },
      message: 'A Permission request requires an active Turn',
    });
    expect(
      await user.operations.run.mutate({
        id,
        params: { ...params, sessionId: foreign.sessionId },
      }),
    ).toMatchObject(expected(otherId));
  },
  30_000,
);
