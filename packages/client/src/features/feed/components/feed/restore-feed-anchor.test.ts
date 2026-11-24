import { type Mock, describe, expect, it, vi } from 'vitest';
import { type AnchoredList, restoreFeedAnchor } from './restore-feed-anchor';

const anchor = { key: 'row-7', offset: 120 };

// A list whose row sits somewhere else every time it is read, as while rows above it are still measuring.
interface DriftingList extends AnchoredList {
  scrollToKey: Mock<AnchoredList['scrollToKey']>;
  anchorVisibleContent: Mock<AnchoredList['anchorVisibleContent']>;
}

const drifting = (): DriftingList => ({
  scrollToKey: vi.fn<AnchoredList['scrollToKey']>(() => Promise.resolve()),
  anchorVisibleContent: vi.fn<AnchoredList['anchorVisibleContent']>(() => ({
    key: anchor.key,
    offset: 300,
  })),
});

describe('restoreFeedAnchor', () => {
  it('scrolls to the remembered row once and leaves the list to hold it', async () => {
    const list = drifting();

    await restoreFeedAnchor(list, anchor, new AbortController().signal);

    expect(list.scrollToKey).toHaveBeenCalledOnce();
    expect(list.anchorVisibleContent).toHaveBeenCalledWith({ key: anchor.key });
  });

  it('does nothing more once the reader has taken over', async () => {
    const list = drifting();
    const controller = new AbortController();
    controller.abort();

    await restoreFeedAnchor(list, anchor, controller.signal);

    expect(list.anchorVisibleContent).not.toHaveBeenCalled();
  });
});
