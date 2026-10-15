import type * as React from 'react';
import { Spinner } from '#primitives/display/spinner';
import { type FieldProgressProps, fieldLoadingLabel } from './text-input-props';

// The spinner that trails a wide or web field while its value is checked.
export function FieldSpinner(
  props: FieldProgressProps,
): React.JSX.Element | null {
  if (!props.loading) return null;

  return <Spinner accessibilityLabel={fieldLoadingLabel(props.label)} />;
}
