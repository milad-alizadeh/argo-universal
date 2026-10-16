import type { LegendListRef } from '@legendapp/list/react-native';
import type { BlobRef } from '@repo/contracts';
import type * as React from 'react';
import { useRef } from 'react';
import { View } from 'react-native';
import { FeedGrowthContext } from '../feed-growth-context';
import type { FeedEntry } from './feed-entry';
import { JumpToLatestWhenAway } from './feed-overlays';
import { FeedScroll, type FeedScrollProps } from './feed-scroll';
import { useFeedGrowth } from './use-feed-growth';
import {
  useFeedScrollPosition,
  useReportsAtEnd,
} from './use-feed-scroll-position';

const fillShrinkable = { flex: 1, minHeight: 0 };

export interface FeedListProps {
  entries: FeedEntry[];
  // The newest row's key, so a row arriving while the reader is away marks Jump to latest.
  newestKey: string;
  loadingOlder: boolean;
  onStartReached: () => void;
  imageUrl: (blob: BlobRef) => string;
  now?: number;
  onAtEndChange?: (atEnd: boolean) => void;
}

interface FeedBodyProps extends Omit<FeedScrollProps, 'atEnd'> {
  newestKeyWhenLeftEnd: string | null;
}

function FeedBody({
  newestKeyWhenLeftEnd,
  ...scroll
}: FeedBodyProps): React.JSX.Element {
  const feedGrowth = useFeedGrowth(scroll.list);

  return (
    <FeedGrowthContext.Provider value={feedGrowth}>
      <FeedScroll {...scroll} atEnd={newestKeyWhenLeftEnd === null} />
    </FeedGrowthContext.Provider>
  );
}

export function FeedList(props: FeedListProps): React.JSX.Element {
  const list = useRef<LegendListRef>(null);
  const position = useFeedScrollPosition(list, props);
  useReportsAtEnd(position.newestKeyWhenLeftEnd === null, props.onAtEndChange);
  const shared = { list, ...props, ...position };

  return (
    <View style={fillShrinkable}>
      <FeedBody {...shared} />
      <JumpToLatestWhenAway {...shared} />
    </View>
  );
}
