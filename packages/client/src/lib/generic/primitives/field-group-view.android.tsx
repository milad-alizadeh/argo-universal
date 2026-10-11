import { Column } from '@expo/ui/jetpack-compose';
import {
  fillMaxSize,
  padding,
  verticalScroll,
} from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWide } from '../use-wide';
import { FieldGroup as WebFieldGroup } from './field-group-view.tsx';
import type { FieldGroupProps } from './field-props';
import { Host } from './host';

const gutter = 16;
const topPadding = 8;
const sectionGap = 24;

export function FieldGroup(props: FieldGroupProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  if (useWide()) return <WebFieldGroup {...props} />;
  return (
    <Host style={{ flex: 1 }} matchContents={false}>
      <Column
        verticalArrangement={{ spacedBy: sectionGap }}
        modifiers={[
          fillMaxSize(),
          verticalScroll(),
          padding(gutter, topPadding, gutter, insets.bottom + sectionGap),
        ]}
      >
        {props.children}
      </Column>
    </Host>
  );
}
