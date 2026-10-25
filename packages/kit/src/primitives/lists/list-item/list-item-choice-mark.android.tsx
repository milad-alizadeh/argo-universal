// No onClick on either mark: the row around it owns the press and the selected semantics.
import { Checkbox, RadioButton } from '@expo/ui/jetpack-compose';
import type { ReactElement } from 'react';
import { Host } from '#primitives/native/host';
import { useMaterialPalette } from '#primitives/native/material-palette';
import type { ChoiceMarkProps } from './list-item-choice-mark';

export function ChoiceMark(props: ChoiceMarkProps): ReactElement {
  return (
    <Host matchContents>
      {props.multiple ? <BoxMark {...props} /> : <RadioMark {...props} />}
    </Host>
  );
}

// A Compose Checkbox with no action is decorative, so its row stays the one control.
function BoxMark(props: ChoiceMarkProps): ReactElement {
  return <Checkbox value={!!props.selected} enabled={!props.disabled} />;
}

function RadioMark(props: ChoiceMarkProps): ReactElement {
  return (
    <RadioButton
      selected={!!props.selected}
      colors={useMaterialPalette().radioColors}
      enabled={!props.disabled}
    />
  );
}
