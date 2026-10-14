import {
  CircularProgressIndicator,
  OutlinedTextField,
  TextField,
} from '@expo/ui/jetpack-compose';
import { semantics, size } from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { textInputLoadingLabel } from './text-input-props';

// Material's trailing icon size.
const indicatorSize = 20;

function LoadingIndicator(): React.JSX.Element {
  return (
    <CircularProgressIndicator
      modifiers={[
        size(indicatorSize, indicatorSize),
        semantics({ contentDescription: textInputLoadingLabel }),
      ]}
    />
  );
}

// Material's own circular indicator in the filled field's trailing slot.
export function FilledFieldLoading({
  loading,
}: {
  loading?: boolean;
}): React.JSX.Element | null {
  if (!loading) return null;

  return (
    <TextField.TrailingIcon>
      <LoadingIndicator />
    </TextField.TrailingIcon>
  );
}

// The same indicator in the outlined field's trailing slot.
export function OutlinedFieldLoading({
  loading,
}: {
  loading?: boolean;
}): React.JSX.Element | null {
  if (!loading) return null;

  return (
    <OutlinedTextField.TrailingIcon>
      <LoadingIndicator />
    </OutlinedTextField.TrailingIcon>
  );
}
