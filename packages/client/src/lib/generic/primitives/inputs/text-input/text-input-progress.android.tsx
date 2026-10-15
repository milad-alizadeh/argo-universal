import { CircularProgressIndicator } from '@expo/ui/jetpack-compose';
import { semantics, size } from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { type FieldProgressProps, fieldLoadingLabel } from './text-input-props';

// The trailing slot sets only a 48dp minimum and the indicator draws 40dp by default, so it takes the 24dp icon size.
const indicatorSize = 24;

export function FieldProgress(
  props: FieldProgressProps,
): React.JSX.Element | null {
  if (!props.loading) return null;

  return (
    <CircularProgressIndicator
      modifiers={[
        size(indicatorSize, indicatorSize),
        semantics({ contentDescription: fieldLoadingLabel(props.label) }),
      ]}
    />
  );
}
