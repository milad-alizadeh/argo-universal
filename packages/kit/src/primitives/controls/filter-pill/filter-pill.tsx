import type * as React from 'react';
import { Pill } from '#primitives/status/pill';
import {
  type FilterPillProps,
  filterPillLabel,
  filterPillSpokenLabel,
} from './filter-pill-props';

export function FilterPill(props: FilterPillProps): React.JSX.Element {
  return (
    <Pill
      variant="control"
      text={filterPillLabel(props)}
      accessibilityLabel={filterPillSpokenLabel(props)}
      selected={props.selected}
      onPress={props.onPress}
    />
  );
}
