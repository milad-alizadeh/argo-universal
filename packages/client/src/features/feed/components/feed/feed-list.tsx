import type { LegendListRef } from '@legendapp/list/react-native';
import type * as React from 'react';
import { useRef } from 'react';
import { View } from 'react-native';
import { FeedGrowthContext } from '../feed-growth-context';
import type { FeedEntry } from './feed-entry';
import { JumpToLatestWhenAway } from './feed-overlays';
import type { EntryDrawing } from './feed-row';
import { FeedScroll, type FeedScrollProps } from './feed-scroll';
import { useFeedGrowth } from './use-feed-growth';
import {
  useFeedScrollPosition,
  useReportsAtEnd,
} from './use-feed-scroll-position';

const fillShrinkable = { flex: 1, minHeight: 0 };

export interface FeedListProps extends EntryDrawing {
  entries: FeedEntry[];
  // The newest row's key, so a row arriving while the reader is away marks Jump to latest.
  newestKey: string;
  loadingOlder: boolean;
  onStartReached: () => void;
  onAtEndChange?: (atEnd: boolean) => void;
  // The Feed opens on the first row and pins no prompt, for a Feed read without a Composer.
  opensAtStart?: boolean;
}

function FeedBody(scroll: FeedScrollProps): React.JSX.Element {
  const feedGrowth = useFeedGrowth(scroll.list);

  return (
    <FeedGrowthContext.Provider value={feedGrowth}>
      <FeedScroll {...scroll} />
    </FeedGrowthContext.Provider>
  );
}

export function FeedList(props: FeedListProps): React.JSX.Element {
  const list = useRef<LegendListRef>(null);
  const position = useFeedScrollPosition(list, props);
  useReportsAtEnd(position.atEnd, props.onAtEndChange);
  const shared = { list, ...props, ...position };

  return (
    <View style={fillShrinkable} className="web:select-text">
      <FeedBody {...shared} />
      <JumpToLatestWhenAway {...shared} />
    </View>
  );
}
