import { ProgressView } from '@expo/ui/swift-ui';
import { accessibilityLabel } from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { type FieldProgressProps, fieldLoadingLabel } from './text-input-props';

// SwiftUI's own indeterminate ProgressView, trailing the field while its value is checked.
export function FieldProgress(
  props: FieldProgressProps,
): React.JSX.Element | null {
  if (!props.loading) return null;

  return (
    <ProgressView
      modifiers={[accessibilityLabel(fieldLoadingLabel(props.label))]}
    />
  );
}
