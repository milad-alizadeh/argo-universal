import { Switch } from '@expo/ui';
import type { ReactElement } from 'react';
import { RowTitle, useRowPressable } from '#primitives/fields/field-row';
import type { FieldGroupKitProps } from '../../kit-props';

/*
 * The web Switch draws its label in Expo's own type, so the title is the row's own text in the kit's body role. The
 * row is a label around both, as Expo's Switch is: it names the switch, and pressing the title flips it.
 */
export function FieldToggle(
  props: FieldGroupKitProps<'FieldGroup.Toggle'>,
): ReactElement {
  useRowPressable(!props.disabled);

  return (
    /* oxlint-disable-next-line jsx-a11y/label-has-associated-control -- Expo's Switch draws the checkbox input inside it. */
    <label className={labelRow}>
      <RowTitle title={props.title} />
      <Switch
        value={props.value}
        onValueChange={props.onValueChange}
        disabled={props.disabled}
      />
    </label>
  );
}

const labelRow = 'flex items-center justify-between';
