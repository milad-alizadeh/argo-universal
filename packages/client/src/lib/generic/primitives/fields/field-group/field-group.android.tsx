import { Column } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, padding } from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { useState } from 'react';
import { ScrollView, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWide } from '../../../use-wide/use-wide';
import { ListSearchField } from '../../inputs/list-search-bar/list-search-bar';
import { Host } from '../../native/host';
import { FieldLayout } from '../field-layout';
import type { FieldGroupProps } from '../field-props';
import { FieldGroup as WebFieldGroup } from './field-group.tsx';

const gutter = 16;

const topPadding = 8;

const sectionGap = 24;

export function FieldGroup(props: FieldGroupProps): React.JSX.Element {
  if (useWide()) return <WebFieldGroup {...props} />;

  return (
    <FieldLayout value={props.variant ?? 'grouped'}>
      <SectionsScroll {...props} />
    </FieldLayout>
  );
}

// React Native scrolls, not Compose: a native sheet takes the drags of anything it cannot nest-scroll.
function SectionsScroll(props: FieldGroupProps): React.JSX.Element {
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
  onContentHeightChange: FieldGroupProps['onContentHeightChange'],
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

// The sections in one Compose column, the search first when there is one.
function SectionsColumn(props: FieldGroupProps): React.JSX.Element {
  const modifiers = useColumnModifiers(props.variant);

  return (
    <Column
      verticalArrangement={{ spacedBy: sectionGap }}
      modifiers={modifiers}
    >
      {props.search && <ListSearchField {...props.search} />}
      {props.children}
    </Column>
  );
}

function useColumnModifiers(
  variant: FieldGroupProps['variant'],
): React.ComponentProps<typeof Column>['modifiers'] {
  const insets = useSafeAreaInsets();
  const sideGutter = sideGutterFor(variant);

  return [
    fillMaxWidth(),
    padding(sideGutter, topPadding, sideGutter, insets.bottom + sectionGap),
  ];
}

// A navigation list's rows span the screen, flat like the sidebar's; grouped cards sit in the gutter.
function sideGutterFor(variant: FieldGroupProps['variant']): number {
  return variant === 'navigation' ? 0 : gutter;
}
