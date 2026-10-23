import { Row, Spacer, Switch } from '@expo/ui';
import type { ReactElement } from 'react';
import { RowTitle } from '#primitives/fields/field-row';
import type { FieldGroupKitProps } from '../../kit-props';

// The web Switch draws its label in Expo's own type, so the title is the row's own text in the kit's body role.
export function FieldToggle(
  props: FieldGroupKitProps<'FieldGroup.Toggle'>,
): ReactElement {
  return (
    <Row alignment="center">
      <RowTitle title={props.title} />
      <Spacer flexible />
      <Switch
        value={props.value}
        onValueChange={props.onValueChange}
        disabled={props.disabled}
      />
    </Row>
  );
}
