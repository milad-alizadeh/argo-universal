// Android only: Expo UI has no universal radio button, so the single-choice mark stays Material's own.
import { RadioButton } from '@expo/ui/jetpack-compose';
import type * as React from 'react';
import type { RadioMarkProps } from './checkbox-radio';

// No onClick: the row around the mark owns the press and the selected semantics.
export function RadioMark(props: RadioMarkProps): React.JSX.Element {
  return (
    <RadioButton
      selected={props.selected}
      enabled={!props.disabled}
      modifiers={props.modifiers}
    />
  );
}
