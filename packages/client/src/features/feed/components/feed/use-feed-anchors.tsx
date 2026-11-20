import type * as React from 'react';
import { Platform, View } from 'react-native';
import { useFeedEndClearance } from '#lib/product/composer-cover';
import { useScreenFocused } from '#lib/product/navigation/navigation';
import { FeedEndView } from './feed-end-view';
import type { FeedListProps, FeedScrollProps } from './feed-scroll';
import { useFeedEndMotion } from './use-feed-end-motion';

// Clears whatever of the Composer covers the Feed's end, and the pill above it, and leaves the Feed's gap above them.
function FeedEnd({ follows }: { follows: boolean }): React.JSX.Element {
  const { endSpace } = useFeedEndClearance();

  const End = follows ? FeedEndView : View;

  return <End style={{ height: endSpace }} />;
}

// Older rows paging in above keep the reader's place, and so do rows above that measure as the reader scrolls.
const keepPosition = { data: true };

// While following the end on native, visible-row corrections can pull the Feed back up.
const keepPositionAtEnd = Platform.OS === 'web' ? keepPosition : false;

const visibleContentPosition = (
  follows: boolean,
): typeof keepPosition | false => (follows ? keepPositionAtEnd : keepPosition);

type AnchorInput = Pick<
  FeedScrollProps,
  'list' | 'atEnd' | 'turnRunning' | 'opensAtStart'
>;

type FeedAnchors = Pick<
  FeedListProps,
  | 'maintainScrollAtEnd'
  | 'alignItemsAtEnd'
  | 'maintainVisibleContentPosition'
  | 'endContent'
>;

// A Feed read from its start, or hidden behind another page, does not follow incoming rows.
function useEndFollowing(opensAtStart: boolean | undefined): boolean {
  return useScreenFocused() && !opensAtStart;
}

const followsFeedEnd = (enabled: boolean, atEnd: boolean): boolean =>
  enabled && atEnd;

export function useFeedAnchors(input: AnchorInput): FeedAnchors {
  const enabled = useEndFollowing(input.opensAtStart);
  const animationEnabled = enabled ? input.turnRunning : false;
  const motion = useFeedEndMotion(input.list, animationEnabled);
  const follows = followsFeedEnd(enabled, input.atEnd);

  return {
    maintainScrollAtEnd: enabled && motion,
    maintainVisibleContentPosition: visibleContentPosition(follows),
    alignItemsAtEnd: false,
    endContent: <FeedEnd follows={follows} />,
  };
}
