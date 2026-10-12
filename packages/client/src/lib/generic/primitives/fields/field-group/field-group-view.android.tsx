import { Column } from '@expo/ui/jetpack-compose';
import {
  fillMaxSize,
  padding,
  verticalScroll,
} from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
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
  if (useWide()) return <WebFieldGroup {...props} />;
  return (
    <FieldLayout value={props.variant ?? 'grouped'}>
      <Host style={{ flex: 1 }} matchContents={false}>
        <ScrollingColumn {...props} />
      </Host>
    </FieldLayout>
  );
}

// The sections in one scrolling Compose column, the search first when there is one.
function ScrollingColumn(props: FieldGroupProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const sideGutter = sideGutterFor(props.variant);
  return (
    <Column
      verticalArrangement={{ spacedBy: sectionGap }}
      modifiers={[
        fillMaxSize(),
        verticalScroll(),
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
