import { expect, it, onTestFinished, vi } from 'vitest';
import { insertSession } from '#mocks/database';
import { upsertRowEvent, createOpenMessageChange } from '#mocks/feed-inputs';
import { createFeedModuleCaller } from '#mocks/feed-module';
import { takeFeedChanges } from '#mocks/feed-observations';
import {
  database,
  feedTestHost,
  controller,
  appliedFeed,
  startFeedTestHost,
  applyFeedChange,
  subscribe,
} from '#mocks/feed-suite';

it('keeps a Subagent Feed stream open until its caller aborts', async (): Promise<void> => {
  await startFeedTestHost();
  insertSession(database, { id: 'subagent', parentSessionId: 'session-1' });
  const updates = await subscribe(null, 'subagent');
  expect((await updates.next()).value).toMatchObject({ type: 'snapshot' });
  const waiting = updates.next();
  controller.abort();
  expect(await waiting).toMatchObject({ done: true });
});

it('ends a pending live Feed iterator when its caller aborts', async (): Promise<void> => {
  await startFeedTestHost();
  const updates = await subscribe(null);
  await updates.next();
  const waiting = updates.next();
  controller.abort();
  expect(await waiting).toMatchObject({ done: true });
});

it('keeps another Feed subscriber live after a caller aborts', async (): Promise<void> => {
  await startFeedTestHost();
  const aborted = await subscribe(null);
  await aborted.next();
  const pendingAbort = aborted.next();
  const continuingController = new AbortController();
  onTestFinished((): void => continuingController.abort());

  const continuing = (
    await createFeedModuleCaller(
      feedTestHost,
      appliedFeed,
      continuingController.signal,
    ).feed.subscribe({ sessionId: 'session-1', after: null })
  )[Symbol.asyncIterator]();

  await continuing.next();
  controller.abort();
  await pendingAbort;
  applyFeedChange(
    createOpenMessageChange('remaining-reader', 'Still connected'),
  );
  await vi.advanceTimersByTimeAsync(60);
  expect(await takeFeedChanges(continuing, 1)).toEqual([
    expect.objectContaining({
      type: upsertRowEvent,
      rev: 6,
      row: expect.objectContaining({ id: 'remaining-reader' }),
    }),
  ]);
});

it('rejects a Feed stream when stored Session hydration fails', async (): Promise<void> => {
  await startFeedTestHost();
  const updates = await subscribe(null);
  await updates.next();
  database.$client.exec("UPDATE session SET title_source = 'unrecognised'");
  applyFeedChange(createOpenMessageChange('snapshot-rejection'));
  await expect(updates.next()).rejects.toMatchObject({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Unrecognised Session row',
  });
});
