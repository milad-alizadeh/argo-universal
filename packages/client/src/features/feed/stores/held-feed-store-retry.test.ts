import { describe, expect, it } from 'vitest';
import {
  append,
  beforeAppend,
  page,
  rowEvents,
  streamed,
} from '../../../../mocks/feed-state.mocks';
import { heldFeedHarness } from '../../../../mocks/feed/held-feed.mocks';

const { rows, snapshot, stream } = streamed;

const tail = page(rows, snapshot.maxRevision);

function openedAtTail(): ReturnType<typeof heldFeedHarness> {
  const h = heldFeedHarness();
  h.store.start();
  h.store.mergeHistory([tail]);
  h.drawFrame();

  return h;
}

describe('HeldFeedStore when the Server closes the Feed', () => {
  it('shows why the Feed closed until the reader retries', () => {
    const h = openedAtTail();
    h.store.receive({ type: 'closed', failure: 'Agent exited' });

    expect(h.store.getState()).toMatchObject({
      closed: true,
      closureError: { message: 'Agent exited' },
    });
    h.store.retryOpen();
    expect(h.store.getState()).toMatchObject({
      closed: false,
      closureError: null,
    });
  });

  it('restarts live changes at the same sync point when no rows arrived since', () => {
    const h = openedAtTail();
    h.store.receive({ type: 'closed', failure: null });

    expect(h.store.getState().closed).toBe(true);
    expect(h.store.retryOpen()).toBe(true);
    expect(h.store.getState().syncPoint).toEqual({
      epoch: 0,
      revision: snapshot.maxRevision,
    });
  });

  it('resumes after the newest revision held when rows arrived since', () => {
    const h = heldFeedHarness();
    h.store.start();
    h.store.mergeHistory([page([], 0)]);

    for (const event of rowEvents(stream)) h.store.receive(event);

    expect(h.store.retryOpen()).toBe(false);
    expect(h.store.getState().syncPoint).toEqual({
      epoch: 0,
      revision: snapshot.maxRevision,
    });
  });
});

describe('HeldFeedStore when the Server rebuilds the Feed', () => {
  it('drops the rows held and pages the new epoch from its tail', () => {
    const h = openedAtTail();
    h.store.receive({ type: 'reset', epoch: 1 });
    h.drawFrame();

    expect(h.resetHistory).toHaveBeenCalledOnce();
    expect(h.store.getState().feed).toMatchObject({ epoch: 1, rows: [] });
    h.store.mergeHistory([{ ...tail, epoch: 1 }]);
    h.drawFrame();
    expect(h.store.getState().feed).toMatchObject({ epoch: 1, rows });
  });
});

describe('HeldFeedStore when a change misses its row', () => {
  it('fetches the row whole and commits it at the next frame', async () => {
    const h = heldFeedHarness();
    h.store.start();
    h.store.mergeHistory([page([], 0)]);
    h.store.receive(append);
    const whole = beforeAppend.rows.find((row) => row.id === append.id);

    if (!whole) throw new Error('Recorded stream needs the appended row');
    expect(h.fetches.map((fetch) => fetch.id)).toEqual([append.id]);
    h.fetches[0]?.resolve(whole);
    await Promise.resolve();
    h.drawFrame();
    expect(h.store.getState().feed.rows).toEqual([whole]);
  });
});
