import { CircularProgressIndicator } from '@expo/ui/jetpack-compose';
import { semantics, size } from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { useMaterialPalette } from '#primitives/native/material-palette';
import { type FieldProgressProps, fieldLoadingLabel } from './text-input-props';

// Muted, as the kit's React Native Spinner. The trailing slot sets only a 48dp minimum and the indicator draws 40dp by default, so it takes the 24dp icon size.
const indicatorSize = 24;

export function FieldProgress(
  props: FieldProgressProps,
): React.JSX.Element | null {
  const color = useMaterialPalette().roles.onSurfaceVariant;

  if (!props.loading) return null;

  return (
    <CircularProgressIndicator
      color={color}
      modifiers={[
        size(indicatorSize, indicatorSize),
        semantics({ contentDescription: fieldLoadingLabel(props.label) }),
      ]}
    />
  );
}
