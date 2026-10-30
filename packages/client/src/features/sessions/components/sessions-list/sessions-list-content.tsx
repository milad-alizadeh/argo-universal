import { hasLiquidGlass } from '@repo/kit/native-header';
import { ActionShortcutScope } from '@repo/kit/primitives/actions/action';
import { List } from '@repo/kit/primitives/lists/list';
import { useSidebarGutterHeld } from '@repo/kit/sidebar-gutter';
import { cn } from '@repo/kit/utils';
import type * as React from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { SessionsListEntry } from '../sessions-list-entries';
import { EmptySessionsList } from './empty-sessions-list';
import { DrawnRows } from './sessions-list-drawn-rows';
import { listsFlat, searchesAsOneList } from './sessions-list-entries-state';
import { type ListRows, useListRows } from './sessions-list-entry-rows';
import { sessionsListLook } from './sessions-list-look';
import type { SessionsListProps } from './sessions-list-props';
import { useScrolling } from './sessions-list-scrolling';
import { standardTopPadding } from './sessions-list-top-padding';
import {
  useSessionsSelection,
  sessionsListBehaviours,
} from './use-sessions-selection';

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
    empty: <EmptySessionsList query={props.query} view={props.view} />,
    estimatedItemSize: estimatedItemSize[props.view.layout],
  };
}

interface SessionsLegendListProps extends SessionsListProps {
  rows: ListRows;
  onScroll: () => void;
  selection?: React.ComponentProps<typeof List<SessionsListEntry>>['selection'];
  actions?: ReactNode;
}

const searchTopPadding = { compact: 0, wide: 2 } as const;

function sessionListSection(
  props: SessionsListProps,
): typeof entrySection | undefined {
  return listsFlat(props) ? undefined : entrySection;
}

type SessionListOptions = Pick<
  React.ComponentProps<typeof List<SessionsListEntry>>,
  | 'appearance'
  | 'density'
  | 'getSectionKey'
  | 'onPhones'
  | 'padding'
  | 'paddingTop'
>;

function sessionListOptions(
  props: SessionsListProps,
  held: boolean,
): SessionListOptions {
  return {
    ...sessionsListLook(props.view.layout, held ? 'inset' : 'padded'),
    getSectionKey: sessionListSection(props),
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
      {...sessionListOptions(props, useSidebarGutterHeld())}
      {...sessionsListBehaviours(props)}
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

type TreeListProps = SessionsListProps & { treeDrawn: boolean };

export function SessionsListContent(props: TreeListProps): React.JSX.Element {
  const scrolling = useScrolling();
  const rows = useListRows(props, props.treeDrawn);
  const selection = useSessionsSelection(props);

  return (
    <SessionsListSurface glide={rows.animating && !scrolling.scrolling}>
      <DrawnRows onRowsDrawn={props.plugins?.onRowsDrawn}>
        <SessionsLegendList
          {...{ ...props, ...selection, rows }}
          onScroll={scrolling.onScroll}
        />
      </DrawnRows>
    </SessionsListSurface>
  );
}
