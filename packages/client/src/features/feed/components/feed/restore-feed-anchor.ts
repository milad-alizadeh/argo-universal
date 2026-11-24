import type { LegendListRef } from '@legendapp/list/react-native';
import type { FeedAnchor } from './feed-scroll-memory';

export type AnchoredList = Pick<
  LegendListRef,
  'scrollToKey' | 'anchorVisibleContent'
>;

// Scroll to the remembered row once, then let Legend List hold it in place while rows around it measure.
export async function restoreFeedAnchor(
  list: AnchoredList,
  anchor: FeedAnchor,
  signal: AbortSignal,
): Promise<void> {
  await list.scrollToKey({
    key: anchor.key,
    viewPosition: 0,
    viewOffset: -anchor.offset,
    animated: false,
  });

  if (!signal.aborted) list.anchorVisibleContent({ key: anchor.key });
}
