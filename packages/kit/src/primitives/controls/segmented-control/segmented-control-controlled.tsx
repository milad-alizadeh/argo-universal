import type * as React from 'react';
import { useState } from 'react';
import { SegmentedControl } from './segmented-control';
import type { SegmentedControlProps } from './segmented-control-props';

// The selected segment is held by the caller, so the stories press against local state.
export function ControlledSegmentedControl(
  props: SegmentedControlProps,
): React.JSX.Element {
  const [value, setValue] = useState(props.value);

  const onValueChange = (next: string): void => {
    setValue(next);
    props.onValueChange(next);
  };

  return (
    <SegmentedControl {...props} value={value} onValueChange={onValueChange} />
  );
}
