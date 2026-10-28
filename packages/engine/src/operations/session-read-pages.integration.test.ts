import {
  SessionChangesOutput,
  SessionDiffOutput,
  SessionFeedOutput,
} from '@repo/contracts';
import type { OperationId } from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { expect, it } from 'vitest';
import { sessionReadScope } from '#mocks/session-read-scope';

const feedOperationId = 'session.feed';

const changesOperationId = 'session.changes';

const diffOperationId = 'session.diff';

const reviewPath = 'review.txt';

it('pages messages, changed files and diff lines with a Session token and checks scope on later pages', async () => {
  const { calling, target, foreign } = await sessionReadScope();
  const run = calling.caller.operations.run;

  const feed = SessionFeedOutput.parse(
    await run.mutate({
      id: feedOperationId,
      params: { sessionId: target.sessionId, limit: 2 },
    }),
  );

  expect(feed.messages).toMatchObject([
    { content: [{ text: 'Second result' }] },
    { content: [{ text: 'Third result' }] },
  ]);
  expect(feed.nextCursor).toEqual(expect.any(Number));
  expect(
    await run.mutate({
      id: feedOperationId,
      params: {
        sessionId: target.sessionId,
        cursor: feed.nextCursor,
        epoch: feed.epoch,
        limit: 2,
      },
    }),
  ).toMatchObject({
    messages: [{ content: [{ text: 'First result' }] }],
    nextCursor: null,
  });

  const changes = SessionChangesOutput.parse(
    await run.mutate({
      id: changesOperationId,
      params: { sessionId: target.sessionId, limit: 1 },
    }),
  );

  expect(changes).toMatchObject({
    summary: { files: 2, additions: 4, deletions: 0 },
    files: [{ path: reviewPath }],
    nextCursor: 1,
  });
  expect(
    await run.mutate({
      id: changesOperationId,
      params: {
        sessionId: target.sessionId,
        cursor: changes.nextCursor,
        limit: 1,
      },
    }),
  ).toMatchObject({ files: [{ path: 'second.txt' }], nextCursor: null });

  const diff = SessionDiffOutput.parse(
    await run.mutate({
      id: diffOperationId,
      params: { sessionId: target.sessionId, path: reviewPath, limit: 2 },
    }),
  );

  expect(diff).toMatchObject({ nextCursor: 2 });
  expect(
    await run.mutate({
      id: diffOperationId,
      params: {
        sessionId: target.sessionId,
        path: reviewPath,
        cursor: diff.nextCursor,
        limit: 2,
      },
    }),
  ).toMatchObject({
    patch: { text: expect.stringContaining('@@ -0,0 +3,1 @@') },
    nextCursor: null,
  });

  const laterPages: { id: OperationId; params: Record<string, Json> }[] = [
    {
      id: feedOperationId,
      params: { cursor: feed.nextCursor, epoch: feed.epoch, limit: 2 },
    },
    {
      id: changesOperationId,
      params: { cursor: changes.nextCursor, limit: 1 },
    },
    {
      id: diffOperationId,
      params: { path: reviewPath, cursor: diff.nextCursor, limit: 2 },
    },
  ];

  for (const operation of laterPages)
    await expect(
      run.mutate({
        id: operation.id,
        params: { ...operation.params, sessionId: foreign.sessionId },
      }),
    ).rejects.toMatchObject({
      data: { code: 'CONFLICT' },
      message: 'A Permission request requires an active Turn',
    });
}, 30_000);
