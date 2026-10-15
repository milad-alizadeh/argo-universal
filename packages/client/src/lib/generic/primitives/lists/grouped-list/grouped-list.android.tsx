// Split from iOS: a native sheet takes the drags of anything it cannot nest-scroll, so React Native scrolls the sections here.
import { Column } from '@expo/ui';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { useState } from 'react';
import { ScrollView, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FieldLayout } from '#primitives/fields/field-layout';
import { Host } from '#primitives/native/host';
import { useWide } from '../../../use-wide/use-wide';
import type { GroupedListProps } from './grouped-list-props';
import { GroupedList as WebGroupedList } from './grouped-list.tsx';

const gutter = 16;

const topPadding = 8;

const sectionGap = 24;

export function GroupedList(props: GroupedListProps): React.JSX.Element {
  if (useWide()) return <WebGroupedList {...props} />;

  return (
    <FieldLayout value={props.variant ?? 'grouped'}>
      <SectionsScroll {...props} />
    </FieldLayout>
  );
}

// React Native scrolls, not Compose: a native sheet takes the drags of anything it cannot nest-scroll.
function SectionsScroll(props: GroupedListProps): React.JSX.Element {
  const scroll = useOverflowScroll(props.onContentHeightChange);

  return (
    <ScrollView className="flex-1" {...scroll}>
      {/* Viewport measurement would cap the rows at the screen's height and clip a longer list. */}
      <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
        <SectionsColumn {...props} />
      </Host>
    </ScrollView>
  );
}

type OverflowScroll = Pick<
  ScrollViewProps,
  'nestedScrollEnabled' | 'onLayout' | 'onContentSizeChange'
>;

// Only a group that overflows nest-scrolls, as Android's sheet picks its scrolling list when it resizes.
function useOverflowScroll(
  onContentHeightChange: GroupedListProps['onContentHeightChange'],
): OverflowScroll {
  const [viewport, setViewport] = useState(0);
  const [content, setContent] = useState(0);

  return {
    nestedScrollEnabled: content > viewport,
    onLayout: (event) => setViewport(event.nativeEvent.layout.height),
    onContentSizeChange: (_, height) => {
      setContent(height);
      onContentHeightChange?.(height);
    },
  };
}

// FieldGroup's lazy column cannot measure inside a React Native scroll view.
function SectionsColumn(props: GroupedListProps): React.JSX.Element {
  const style = useColumnPadding(props.variant);

  return (
    <Column spacing={sectionGap} style={style} modifiers={[fillMaxWidth()]}>
      {props.children}
    </Column>
  );
}

function useColumnPadding(
  variant: GroupedListProps['variant'],
): React.ComponentProps<typeof Column>['style'] {
  const insets = useSafeAreaInsets();

  return {
    paddingHorizontal: sideGutterFor(variant),
    paddingTop: topPadding,
    paddingBottom: insets.bottom + sectionGap,
  };
}

// A sidebar list's rows span the screen, flat like the sidebar's; grouped cards sit in the gutter.
function sideGutterFor(variant: GroupedListProps['variant']): number {
  return variant === 'sidebar' ? 0 : gutter;
}

GroupedList satisfies React.ComponentType<GroupedListProps>;
