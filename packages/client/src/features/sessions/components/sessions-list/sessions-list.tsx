import { LegendList } from '@legendapp/list/react-native';
import type * as React from 'react';
import type { ReactNode } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  View,
} from 'react-native';
import { listTestIdProps } from '#lib/generic/list-test-id';
import { hasLiquidGlass } from '#lib/generic/native-header';
import {
  ScrollColumnContext,
  useScrollColumnStyle,
} from '#lib/generic/scroll-column';
import { cn } from '#lib/generic/utils';
import { useScrollFadeEdges } from '#lib/product/scroll-fade/scroll-fade';
import { ScrollFadeFrame } from '#lib/product/scroll-fade/scroll-fade-frame';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import type { SessionsListEntry } from '../sessions-list-entries';
import { useListRows } from './sessions-list-entry-rows';
import type { SessionsListProps } from './sessions-list-props';
import { EmptySessionsList } from './sessions-list-rows';
import { nativeOnlyListProps, useScrolling } from './sessions-list-scrolling';

/*
 * Wide, Paper's sidebar list: the first Project sits level with the rail's first tile.
 * The shell's list pane sets the column its content keeps to, 8 from the left and 14 from the right, so rows add no side padding.
 */
const contentStyle = {
  paddingLeft: 0,
  paddingRight: 0,
  paddingTop: 6,
  paddingBottom: 28,
};

// A phone list insets its Session cards 8 from the screen's edges, as Paper's Sessions screen does.
const phoneContentStyle = {
  ...contentStyle,
  paddingLeft: 8,
  paddingRight: 8,
  paddingTop: 20,
};

function useContentStyle(wide: boolean): typeof contentStyle {
  return wide ? contentStyle : phoneContentStyle;
}

function entryKey(entry: SessionsListEntry): string {
  return entry.id;
}

// Headings and Session rows each reuse their own kind, so a scrolled-in row keeps its mounted components.
function entryKind(entry: SessionsListEntry): SessionsListEntry['kind'] {
  return entry.kind;
}

const fillStyle = { minHeight: 0 };

const listBehaviour = {
  ...listTestIdProps('sessions-scroll'),
  style: { flex: 1 },
  // On iOS it scrolls by the fade's top padding on mount, then snaps back.
  maintainVisibleContentPosition: false,
  keyExtractor: entryKey,
  estimatedItemSize: 76,
  // Rows hold no state of their own, so scrolling reuses them instead of mounting new ones.
  recycleItems: true,
  getItemType: entryKind,
  onEndReachedThreshold: 0.5,
  ...nativeOnlyListProps,
};

// The page's colour, which a native list fades into; the web fades the rows themselves over the glass.
const fadeSurface = 'bg-sidebar';

function surfaceClassName(scrolling: boolean): string {
  return cn(
    'relative flex-1 overflow-hidden bg-sidebar wide:bg-transparent web:select-none web:[&_*]:select-none!',
    // Rows glide to their measured places at rest; while scrolling they snap, so reused rows never slide across the list.
    !scrolling &&
      'web:[&_[data-testid=sessions-scroll]>div>div>div]:transition-[top,transform] web:[&_[data-testid=sessions-scroll]>div>div>div]:duration-200',
  );
}

interface SessionsListSurfaceProps {
  scrolling: boolean;
  fadeTop: boolean;
  children: ReactNode;
}

// The bottom fade stays, so the last rows always sink into the edge.
function fadeEdges(fadeTop: boolean): { top: boolean; bottom: boolean } {
  return { top: fadeTop && !hasLiquidGlass, bottom: true };
}

const fadeFrameLayout = {
  surfaceClassName: fadeSurface,
  className: 'flex-1',
  style: fillStyle,
};

function SessionsListSurface(
  props: SessionsListSurfaceProps,
): React.JSX.Element {
  return (
    <View className={surfaceClassName(props.scrolling)} style={fillStyle}>
      <ScrollFadeFrame edges={fadeEdges(props.fadeTop)} {...fadeFrameLayout}>
        <ScrollColumnContext value={undefined}>
          {props.children}
        </ScrollColumnContext>
      </ScrollFadeFrame>
    </View>
  );
}

interface ListChrome {
  ListHeaderComponent?: React.ReactElement;
  ListEmptyComponent: React.ReactElement;
}

function listChrome(props: SessionsListProps): ListChrome {
  return {
    ListHeaderComponent: props.header,
    ListEmptyComponent: props.placeholder ?? (
      <EmptySessionsList query={props.query} archived={props.archived} />
    ),
  };
}

interface SessionsLegendListProps extends SessionsListProps {
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

function useListContentStyle(): ReturnType<typeof useScrollColumnStyle> {
  return useScrollColumnStyle(useContentStyle(useWide()));
}

function SessionsLegendList(props: SessionsLegendListProps): React.JSX.Element {
  const contentContainerStyle = useListContentStyle();
  const rows = useListRows(props);
  return (
    <LegendList
      {...listBehaviour}
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
  // The top fade shows once content has scrolled under the header.
  const scrollFade = useScrollFadeEdges({ onScroll: scrolling.onScroll });
  return (
    <SessionsListSurface
      scrolling={scrolling.scrolling}
      fadeTop={scrollFade.edges.top}
    >
      <SessionsLegendList {...props} onScroll={scrollFade.onScroll} />
    </SessionsListSurface>
  );
}
