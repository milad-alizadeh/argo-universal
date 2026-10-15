import { Toggle } from '@expo/ui/swift-ui';
import { accessibilityLabel, toggleStyle } from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { ControlHost } from '#primitives/native/native-control';
import { useWide } from '../../../use-wide/use-wide';
import { type FilterPillProps, filterPillText } from './filter-pill-props';
import { FilterPill as WideFilterPill } from './filter-pill.tsx';

// A phone's filter is SwiftUI's own Toggle in `.toggleStyle(.button)`: the system draws it highlighted while on.
export function FilterPill(props: FilterPillProps): React.JSX.Element {
  if (useWide()) return <WideFilterPill {...props} />;

  return (
    <ControlHost matchContents>
      <Toggle
        label={filterPillText(props).join(' ')}
        isOn={props.selected}
        onIsOnChange={props.onPress}
        modifiers={pillModifiers(props)}
      />
    </ControlHost>
  );
}

const pillModifiers = (
  props: FilterPillProps,
): React.ComponentProps<typeof Toggle>['modifiers'] => [
  toggleStyle('button'),
  accessibilityLabel(filterPillText(props).join(', ')),
];

FilterPill satisfies React.ComponentType<FilterPillProps>;
