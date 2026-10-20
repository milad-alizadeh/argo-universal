import type * as React from 'react';
import type { ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { hasLiquidGlass } from '#lib/generic/native-header';
import { cn } from '#lib/generic/utils';
import { ActionShortcutScope } from '#primitives/actions/action-list';
import { List } from '#primitives/lists/list';
import type { SessionsListEntry } from '../sessions-list-entries';
import { EmptySessionsList } from './empty-sessions-list';
import { listsFlat, searchesAsOneList } from './sessions-list-entries-state';
import { type ListRows, useListRows } from './sessions-list-entry-rows';
import type { SessionsListProps } from './sessions-list-props';
import { useScrolling } from './sessions-list-scrolling';

function entrySection(entry: SessionsListEntry): string {
  return entry.kind === 'session' ? entry.session.projectId : entry.id;
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
const estimatedItemSize = { regular: 80, compact: 38 } as const;

const listBehaviour = {
  testID: 'sessions-scroll',
  keyExtractor: entryKey,
  // Rows hold no state of their own, so scrolling reuses them instead of mounting new ones.
  recycleItems: true,
  getItemType: entryKind,
  onEndReachedThreshold: 0.5,
  contentInsetAdjustmentBehavior: 'automatic' as const,
};

// The top fades once content scrolls under the header, unless iOS's glass header shades it; the last rows always sink into the bottom edge.
const sessionsFade = {
  edges: { top: hasLiquidGlass ? 'never' : 'scrolled', bottom: 'always' },
} as const;

function surfaceClassName(glide: boolean): string {
  return cn(
    'relative flex-1 overflow-hidden bg-content wide:bg-transparent web:select-none web:**:select-none!',
    // Rows glide to their new places only while the list reorders, never on first load, a tab switch or a scroll.
    glide &&
      'web:[&_[data-testid=sessions-scroll]>div>div>div]:transition-[top,transform] web:[&_[data-testid=sessions-scroll]>div>div>div]:duration-200',
  );
}

interface SessionsListSurfaceProps {
  glide: boolean;
  children: ReactNode;
}

function SessionsListSurface(
  props: SessionsListSurfaceProps,
): React.JSX.Element {
  return (
    <ActionShortcutScope>
      <View className={surfaceClassName(props.glide)} style={fillStyle}>
        {props.children}
      </View>
    </ActionShortcutScope>
  );
}

interface ListChrome {
  empty: React.ReactElement;
  estimatedItemSize: number;
}

function listChrome(props: SessionsListProps): ListChrome {
  return {
    empty: props.placeholder ?? (
      <EmptySessionsList query={props.query} view={props.view} />
    ),
    estimatedItemSize: estimatedItemSize[props.view.layout],
  };
}

interface SessionsLegendListProps extends SessionsListProps {
  rows: ListRows;
  onScroll: () => void;
}

const standardTopPadding = { compact: 5, wide: 1 } as const;

const searchTopPadding = { compact: 0, wide: 2 } as const;

// Web draws Session rows flat on the sidebar, with no card, edge or separator (Paper "Screen / 1 Porcelain · Ring · Regular"); phones keep their cards and grouped lists.
function sessionListAppearance(
  props: SessionsListProps,
): 'plain' | 'grouped' | 'cards' {
  if (Platform.OS === 'web') return 'plain';

  return props.view.layout === 'compact' ? 'grouped' : 'cards';
}

// Paper "SessionsList": web rows sit 8 in from the sidebar's left, and each row's own margin takes the right to 14.
const sessionListPadding = {
  compact: 4,
  wide: Platform.OS === 'web' ? 2 : 0,
} as const;

function sessionListSection(
  props: SessionsListProps,
): typeof entrySection | undefined {
  return listsFlat(props) ? undefined : entrySection;
}

function sessionListOptions(
  props: SessionsListProps,
): Pick<
  React.ComponentProps<typeof List<SessionsListEntry>>,
  'appearance' | 'getSectionKey' | 'padding' | 'paddingTop'
> {
  return {
    appearance: sessionListAppearance(props),
    getSectionKey: sessionListSection(props),
    padding: sessionListPadding,
    paddingTop: searchesAsOneList(props)
      ? searchTopPadding
      : standardTopPadding,
  };
}

function SessionsLegendList(props: SessionsLegendListProps): React.JSX.Element {
  return (
    <List
      {...listBehaviour}
      {...sessionsFade}
      {...sessionListOptions(props)}
      onEndReached={props.onEndReached}
      onScroll={props.onScroll}
      {...listRows(props.rows)}
      {...listChrome(props)}
    />
  );
}

// The rows' data without the flag that only the surface reads.
function listRows({
  animating: _animating,
  ...rows
}: ListRows): Omit<ListRows, 'animating'> {
  return rows;
}

export function SessionsList(props: SessionsListProps): React.JSX.Element {
  const scrolling = useScrolling();
  const rows = useListRows(props);

  return (
    <SessionsListSurface glide={rows.animating && !scrolling.scrolling}>
      <SessionsLegendList
        {...props}
        rows={rows}
        onScroll={scrolling.onScroll}
      />
    </SessionsListSurface>
  );
}
