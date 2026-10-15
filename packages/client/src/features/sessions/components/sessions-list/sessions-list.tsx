import type * as React from 'react';
import { type ReactNode, useMemo } from 'react';
import { View } from 'react-native';
import { listTestIdProps } from '#lib/generic/list-test-id';
import { hasLiquidGlass } from '#lib/generic/native-header';
import { useWide } from '#lib/generic/use-wide/use-wide';
import { cn } from '#lib/generic/utils';
import {
  ScrollFadeList,
  useScrollFadeEndGap,
} from '#lib/product/scroll-fade/scroll-fade-list';
import type { SessionsListEntry } from '../sessions-list-entries';
import { useListRows } from './sessions-list-entry-rows';
import type { SessionsListProps } from './sessions-list-props';
import { EmptySessionsList } from './sessions-list-rows';
import { useScrolling } from './sessions-list-scrolling';

/*
 * Wide, Paper's sidebar list: the first Project sits level with the rail's first tile.
 * The Frame's list pane sets the column its content keeps to, 8 from the left and 14 from the right, so rows add no side padding.
 */
const contentStyle = {
  paddingLeft: 0,
  paddingRight: 0,
  paddingTop: 6,
};

// A phone list insets its Session cards 16 from the screen's edges, as Paper's Sessions screen does.
const phoneContentStyle = {
  ...contentStyle,
  paddingLeft: 16,
  paddingRight: 16,
  paddingTop: 20,
};

// Flat search results start right under the open search, as Material's search results do.
const searchResultsContentStyle = { ...phoneContentStyle, paddingTop: 0 };

// The last row rests the scroll fade's small end gap above the bottom, its fade lying in that gap.
function useContentStyle(
  flat: boolean,
): typeof contentStyle & { paddingBottom: number } {
  const wide = useWide();
  const paddingBottom = useScrollFadeEndGap();
  let style = phoneContentStyle;

  if (wide) style = contentStyle;
  else if (flat) style = searchResultsContentStyle;

  return useMemo(() => ({ ...style, paddingBottom }), [style, paddingBottom]);
}

function entryKey(entry: SessionsListEntry): string {
  return entry.id;
}

// Headings and Session rows each reuse their own kind, so a scrolled-in row keeps its mounted components.
function entryKind(entry: SessionsListEntry): SessionsListEntry['kind'] {
  return entry.kind;
}

const fillStyle = { minHeight: 0 };

// A Regular row and the 8 below it; a Compact row is one line.
const estimatedItemSize = { regular: 84, compact: 40 } as const;

const listBehaviour = {
  ...listTestIdProps('sessions-scroll'),
  keyExtractor: entryKey,
  // Rows hold no state of their own, so scrolling reuses them instead of mounting new ones.
  recycleItems: true,
  getItemType: entryKind,
  onEndReachedThreshold: 0.5,
  contentInsetAdjustmentBehavior: 'automatic' as const,
};

// The page's colour, which a native list fades into; the web fades the rows themselves over the glass.
const fadeSurface = 'bg-content';

// The top fades once content scrolls under the header, unless iOS's glass header shades it; the last rows always sink into the bottom edge.
const sessionsFade = {
  edges: { top: hasLiquidGlass ? 'never' : 'scrolled', bottom: 'always' },
  surfaceClassName: fadeSurface,
} as const;

function surfaceClassName(scrolling: boolean): string {
  return cn(
    'relative flex-1 overflow-hidden bg-content wide:bg-transparent web:select-none web:[&_*]:select-none!',
    // Rows glide to their measured places at rest; while scrolling they snap, so reused rows never slide across the list.
    !scrolling &&
      'web:[&_[data-testid=sessions-scroll]>div>div>div]:transition-[top,transform] web:[&_[data-testid=sessions-scroll]>div>div>div]:duration-200',
  );
}

interface SessionsListSurfaceProps {
  scrolling: boolean;
  children: ReactNode;
}

function SessionsListSurface(
  props: SessionsListSurfaceProps,
): React.JSX.Element {
  return (
    <View className={surfaceClassName(props.scrolling)} style={fillStyle}>
      {props.children}
    </View>
  );
}

interface ListChrome {
  ListEmptyComponent: React.ReactElement;
  estimatedItemSize: number;
}

function listChrome(props: SessionsListProps): ListChrome {
  return {
    ListEmptyComponent: props.placeholder ?? (
      <EmptySessionsList query={props.query} archived={props.archived} />
    ),
    estimatedItemSize: estimatedItemSize[props.layout ?? 'regular'],
  };
}

interface SessionsLegendListProps extends SessionsListProps {
  onScroll: () => void;
}

function SessionsLegendList(props: SessionsLegendListProps): React.JSX.Element {
  const contentContainerStyle = useContentStyle(props.flat ?? false);
  const rows = useListRows(props);

  return (
    <ScrollFadeList
      {...listBehaviour}
      {...sessionsFade}
      contentContainerStyle={contentContainerStyle}
      onEndReached={props.onEndReached}
      onScroll={props.onScroll}
      {...rows}
      {...listChrome(props)}
    />
  );
}

export function SessionsList(props: SessionsListProps): React.JSX.Element {
  const scrolling = useScrolling();

  return (
    <SessionsListSurface scrolling={scrolling.scrolling}>
      <SessionsLegendList {...props} onScroll={scrolling.onScroll} />
    </SessionsListSurface>
  );
}
