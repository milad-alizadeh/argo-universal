import { describe, expect, it } from 'vitest';
import {
  append,
  beforeAppend,
  page,
  rowEvents,
  streamed,
} from '../../../../mocks/feed-state.mocks';
import {
  keptFeeds,
  sessionFeedHarness,
} from '../../../../mocks/feed/session-feed-store.mocks';

const { rows, snapshot, stream } = streamed;

const tail = page(rows, snapshot.maxRevision);

describe('SessionFeedStore while a screen shows the Session', () => {
  it('retains the kept Feed once however often it starts, and lets it go on stop', () => {
    const feeds = keptFeeds();
    const h = sessionFeedHarness(feeds.slotOf('session-1'));
    h.store.start();
    const stop = h.store.start();

    expect(feeds.entryOf('session-1').retainers).toBe(1);
    stop();
    expect(feeds.entryOf('session-1').retainers).toBe(0);
  });

  it('commits the rows it held when started again after a stop', () => {
    const h = sessionFeedHarness();
    const stop = h.store.start();
    h.store.mergeHistory([tail]);
    stop();
    h.drawFrame();

    expect(h.store.getState().feed.rows).toEqual([]);
    h.store.start();
    h.drawFrame();
    expect(h.store.getState().feed.rows).toEqual(rows);
  });

  it('drops a row fetched for a run that stopped, even once started again', async () => {
    const whole = beforeAppend.rows.find((row) => row.id === append.id);

    if (!whole) throw new Error('Recorded stream needs the appended row');
    const h = sessionFeedHarness();
    const stop = h.store.start();
    h.store.mergeHistory([page([], 0)]);
    h.store.receive(append);
    stop();
    h.store.start();
    h.fetches[0]?.resolve(whole);
    await Promise.resolve();
    h.drawFrame();

    expect(h.store.getState().feed.rows).toEqual([]);
  });

  it('retries nothing for a Session it does not show', () => {
    const h = sessionFeedHarness();
    const before = h.store.getState();

    expect(h.store.retryOpen()).toBe(false);
    expect(h.store.getState()).toBe(before);
  });

  it('keeps the Feed for the next screen only when its rows or snapshot change', () => {
    const feeds = keptFeeds();
    const h = sessionFeedHarness(feeds.slotOf('session-1'));
    h.store.start();
    h.store.mergeHistory([tail]);
    h.drawFrame();
    h.store.receive({ type: 'snapshot', snapshot });

    expect(feeds.entryOf('session-1').writes).toBe(2);
    h.store.receive({ type: 'closed', failure: null });
    h.store.retryOpen();
    expect(feeds.entryOf('session-1').writes).toBe(2);
  });

  it('drops what reaches the next Session before the screen starts showing it', () => {
    const feeds = keptFeeds();
    const left = sessionFeedHarness(feeds.slotOf('session-1'));
    const stopLeft = left.store.start();
    const next = sessionFeedHarness(feeds.slotOf('session-2'));

    // The left Session's subscription still delivers to the newest render's store until its effect cleans up.
    for (const event of rowEvents(stream)) next.store.receive(event);

    stopLeft();
    next.store.start();
    next.drawFrame();
    expect(next.store.getState().feed.rows).toEqual([]);
    expect(feeds.entryOf('session-1').retainers).toBe(0);
    expect(feeds.entryOf('session-2').retainers).toBe(1);
  });
});
