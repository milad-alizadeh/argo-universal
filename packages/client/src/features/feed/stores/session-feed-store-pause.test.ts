import { describe, expect, it } from 'vitest';
import { page, rowEvents, streamed } from '../../../../mocks/feed-state.mocks';
import {
  type SessionFeedHarness,
  sessionFeedHarness,
} from '../../../../mocks/feed/session-feed-store.mocks';

const { rows, snapshot, stream } = streamed;

const events = rowEvents(stream);

// A Session shown, committed at its first page, then hidden.
function hiddenSession(): SessionFeedHarness {
  const h = sessionFeedHarness();
  const stop = h.store.start();
  h.store.mergeHistory([page([], 0)]);
  h.store.receive({ type: 'snapshot', snapshot });
  h.drawFrame();
  stop();

  return h;
}

describe('SessionFeedStore while its page is hidden', () => {
  it('commits nothing and tells no subscriber while the Session streams', () => {
    const h = hiddenSession();
    const before = h.changes();

    for (const event of events) h.store.receive(event);
    h.drawFrame();

    expect(h.changes()).toBe(before);
    expect(h.store.getState().feed.rows).toEqual([]);
  });

  it('opens live changes at the rows it held, not where it first opened, when shown again', () => {
    const h = hiddenSession();
    const stop = h.store.start();

    for (const event of events) h.store.receive(event);
    h.drawFrame();
    stop();
    const heldAt = h.store.getState().feed.revision;

    expect(h.store.getState().syncPoint).toEqual({ epoch: 0, revision: 0 });
    h.store.start();
    expect(h.store.getState().syncPoint).toEqual({
      epoch: 0,
      revision: heldAt,
    });
  });

  it('commits the rows it held when shown again, in order', () => {
    const h = hiddenSession();
    const stop = h.store.start();

    for (const event of events) h.store.receive(event);
    stop();
    h.store.start();
    h.drawFrame();

    expect(h.store.getState().feed.rows).toEqual(rows);
  });
});
