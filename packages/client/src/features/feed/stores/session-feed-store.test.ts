import { describe, expect, it } from 'vitest';
import { page, rowEvents, streamed } from '../../../../mocks/feed-state.mocks';
import {
  sessionFeedHarness,
  keptFeeds,
} from '../../../../mocks/feed/session-feed-store.mocks';

const { rows, snapshot, stream } = streamed;

const tail = page(rows, snapshot.maxRevision);

const resumeAt = { epoch: 0, revision: snapshot.maxRevision };

describe('SessionFeedStore', () => {
  it('commits the first history page at the next frame and resumes live changes from it', () => {
    const h = sessionFeedHarness();
    h.store.start();
    h.store.mergeHistory([tail]);
    h.store.receive({ type: 'snapshot', snapshot });

    expect(h.store.getState().feed.rows).toEqual([]);
    h.drawFrame();
    expect(h.store.getState()).toMatchObject({
      feed: { rows },
      syncPoint: resumeAt,
    });
    expect(h.store.getState().view?.items.length).toBeGreaterThan(0);
  });

  it('keeps the sync point it opened at when history pages again', () => {
    const h = sessionFeedHarness();
    h.store.start();
    h.store.mergeHistory([page(rows, 7)]);
    h.store.mergeHistory([tail]);
    h.drawFrame();

    expect(h.store.getState().syncPoint).toEqual({ epoch: 0, revision: 7 });
  });

  it('commits a streaming Turn once per frame', () => {
    const h = sessionFeedHarness();
    h.store.start();
    h.store.mergeHistory([page([], 0)]);
    h.drawFrame();
    const before = h.changes();

    for (const event of rowEvents(stream)) h.store.receive(event);
    h.drawFrame();

    expect(h.changes() - before).toBe(1);
    expect(h.store.getState().feed.rows).toEqual(rows);
  });

  it('starts a Session shown before from its held Feed, resuming after the rows held', () => {
    const { slotOf } = keptFeeds();
    const left = sessionFeedHarness(slotOf('session-1'));
    const stop = left.store.start();
    left.store.mergeHistory([tail]);
    left.store.receive({ type: 'snapshot', snapshot });
    left.drawFrame();
    stop();

    const back = sessionFeedHarness(slotOf('session-1')).store.getState();
    const other = sessionFeedHarness(slotOf('session-2')).store.getState();

    expect(back).toMatchObject({
      feed: { rows },
      snapshot,
      syncPoint: resumeAt,
    });
    expect(back.view).toEqual(left.store.getState().view);
    expect(other).toMatchObject({
      feed: { rows: [] },
      view: null,
      syncPoint: null,
    });
  });

  it('drops the frame it held and everything sent after the reader left the Session', async () => {
    const h = sessionFeedHarness();
    const stop = h.store.start();
    h.store.mergeHistory([page([], 0)]);
    h.drawFrame();
    const [first, ...rest] = rowEvents(stream);

    if (!first) throw new Error('Recorded stream needs a row event');
    h.store.receive(first);
    stop();

    for (const event of rest) h.store.receive(event);
    h.store.receive({ type: 'snapshot', snapshot });
    h.store.mergeHistory([tail]);
    h.drawFrame();
    await Promise.resolve();

    expect(h.store.getState()).toMatchObject({
      feed: { rows: [] },
      snapshot: null,
    });
  });

  it('takes nothing before it starts showing the Session', () => {
    const h = sessionFeedHarness();
    h.store.mergeHistory([tail]);
    h.drawFrame();

    expect(h.store.getState()).toMatchObject({
      feed: { rows: [] },
      syncPoint: null,
    });
  });
});
