import type * as React from 'react';
import { Platform, View } from 'react-native';
import { useFeedEndClearance } from '#lib/product/composer-cover';
import { useScreenFocused } from '#lib/product/navigation/navigation';
import type { FeedListProps, FeedScrollProps } from './feed-scroll';
import { feedScrollRenderer } from './feed-scroll-renderer';
import { useFeedEndMotion } from './use-feed-end-motion';

// Clears whatever of the Composer covers the Feed's end, and the pill above it, and leaves the Feed's gap above them.
function FeedEnd(): React.JSX.Element {
  const { endSpace } = useFeedEndClearance();

  return <View style={{ height: endSpace }} />;
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
  'list' | 'atEnd' | 'turnRunning' | 'opensAtStart' | 'conversationActive'
>;

type FeedAnchors = Pick<
  FeedListProps,
  | 'renderScrollComponent'
  | 'maintainScrollAtEnd'
  | 'alignItemsAtEnd'
  | 'maintainVisibleContentPosition'
  | 'endContent'
>;

// While hidden, suspend web follow triggers. Re-enabling the whole feature on return can flush a scroll inside React layout.
const hiddenEndMotion = Platform.OS === 'web' ? { on: {} } : false;

function endMotion(
  opensAtStart: AnchorInput['opensAtStart'],
  shown: boolean,
  motion: ReturnType<typeof useFeedEndMotion>,
): FeedAnchors['maintainScrollAtEnd'] {
  if (opensAtStart) return false;

  return shown ? motion : hiddenEndMotion;
}

const followsFeedEnd = (enabled: boolean, atEnd: boolean): boolean =>
  enabled && atEnd;

export function useFeedAnchors(input: AnchorInput): FeedAnchors {
  const shown = useScreenFocused();
  const enabled = shown && !input.opensAtStart;
  const animatesTurn = enabled && input.turnRunning;

  const followsLiveRows =
    Platform.OS === 'ios' &&
    enabled &&
    (animatesTurn || input.conversationActive === true);

  const motion = useFeedEndMotion(input.list, animatesTurn, followsLiveRows);

  const follows = followsFeedEnd(enabled, input.atEnd);

  return {
    maintainScrollAtEnd: endMotion(input.opensAtStart, shown, motion),
    maintainVisibleContentPosition: visibleContentPosition(follows),
    alignItemsAtEnd: false,
    /*
     * The native footer pin follows the estimated height of a new row before it is measured.
     * Let Legend alone animate to the measured end during live updates.
     */
    renderScrollComponent: feedScrollRenderer(follows && !followsLiveRows),
    endContent: <FeedEnd />,
  };
}
