import { CircularProgressIndicator } from '@expo/ui/jetpack-compose';
import { semantics, size } from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { fieldLoadingLabel } from './text-input-props';

// Material's indeterminate indicator at its small 24dp size, ending the field while its value is checked.
const indicatorSize = 24;

export function FieldProgress(props: {
  label: string;
  loading?: boolean;
}): React.JSX.Element | null {
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
