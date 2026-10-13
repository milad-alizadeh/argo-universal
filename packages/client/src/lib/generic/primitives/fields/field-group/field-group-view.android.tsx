import { Column } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, padding } from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWide } from '../../../use-wide/use-wide';
import { ListSearchField } from '../../inputs/list-search-bar/list-search-bar';
import { Host } from '../../native/host';
import { FieldLayout } from '../field-layout';
import type { FieldGroupProps } from '../field-props';
import { FieldGroup as WebFieldGroup } from './field-group-view.tsx';

const gutter = 16;
const topPadding = 8;
const sectionGap = 24;

export function FieldGroup(props: FieldGroupProps): React.JSX.Element {
  const overflows = useOverflow();
  const insets = useSafeAreaInsets();
  if (useWide()) return <WebFieldGroup {...props} />;
  return (
    <FieldLayout value={props.variant ?? 'grouped'}>
      {/*
       * React Native scrolls, not Compose: a native sheet takes the drags of anything it cannot nest-scroll.
       * The sheet picks its scrolling list when it resizes, so only a group that overflows claims it.
       */}
      <ScrollView
        className="flex-1"
        nestedScrollEnabled={overflows.value}
        onLayout={(event) =>
          overflows.setViewport(event.nativeEvent.layout.height)
        }
        onContentSizeChange={(_, height) => {
          overflows.setContent(height);
          props.onContentHeightChange?.(height - insets.bottom);
        }}
      >
        {/* Viewport measurement would cap the rows at the screen's height and clip a longer list. */}
        <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
          <SectionsColumn {...props} />
        </Host>
      </ScrollView>
    </FieldLayout>
  );
}

function useOverflow(): {
  value: boolean;
  setViewport: (height: number) => void;
  setContent: (height: number) => void;
} {
  const [viewport, setViewport] = useState(0);
  const [content, setContent] = useState(0);
  return { value: content > viewport, setViewport, setContent };
}

// The sections in one Compose column, the search first when there is one.
function SectionsColumn(props: FieldGroupProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const sideGutter = sideGutterFor(props.variant);
  return (
    <Column
      verticalArrangement={{ spacedBy: sectionGap }}
      modifiers={[
        fillMaxWidth(),
        padding(sideGutter, topPadding, sideGutter, insets.bottom + sectionGap),
      ]}
    >
      {props.search && <ListSearchField {...props.search} />}
      {props.children}
    </Column>
  );
}

// A navigation list's rows span the screen, flat like the sidebar's; grouped cards sit in the gutter.
function sideGutterFor(variant: FieldGroupProps['variant']): number {
  return variant === 'navigation' ? 0 : gutter;
}
