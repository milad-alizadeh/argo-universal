import {
  AlertDialog,
  CircularProgressIndicator,
} from '@expo/ui/jetpack-compose';
import {
  type ModifierConfig,
  semantics,
  size,
} from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';

const dialogSpinnerSize = 24;

// A waiting alert shows a spinner in the dialog's icon slot, above its title.
const spinnerModifiers = (label: string): ModifierConfig[] => [
  size(dialogSpinnerSize, dialogSpinnerSize),
  semantics({ contentDescription: label }),
];

export function AlertSpinner(props: {
  busy?: boolean;
  label: string;
}): React.JSX.Element | null {
  if (!props.busy) return null;

  return (
    <AlertDialog.Icon>
      <CircularProgressIndicator modifiers={spinnerModifiers(props.label)} />
    </AlertDialog.Icon>
  );
}
