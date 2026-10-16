import { Toggle } from '@expo/ui/swift-ui';
import { accessibilityLabel, toggleStyle } from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { ControlHost } from '#primitives/native/native-control';
import { filterPillFor } from './filter-pill-phone';
import {
  type FilterPillProps,
  filterPillLabel,
  filterPillSpokenLabel,
} from './filter-pill-props';

// A phone's filter is SwiftUI's own Toggle in `.toggleStyle(.button)`: the system draws it highlighted while on.
function PhonePill(props: FilterPillProps): React.JSX.Element {
  return (
    <ControlHost matchContents style={{ alignSelf: 'flex-start' }}>
      <Toggle
        label={filterPillLabel(props)}
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
  accessibilityLabel(filterPillSpokenLabel(props)),
];

export const FilterPill = filterPillFor(PhonePill);

FilterPill satisfies React.ComponentType<FilterPillProps>;
