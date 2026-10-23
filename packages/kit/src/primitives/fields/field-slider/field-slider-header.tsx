import { Row, Spacer } from '@expo/ui';
import type { ReactElement } from 'react';
import { NativeText } from '#primitives/content/native-text';
import { RowTitle } from '#primitives/fields/field-row';
import type { FieldGroupKitProps } from '../../kit-props';

type Props = FieldGroupKitProps<'FieldGroup.Slider'>;

// The title at the row's start and the value's words at its end, over the slider on the platforms that draw it so.
export function SliderHeader(props: Props): ReactElement {
  return (
    <Row alignment="center">
      <RowTitle title={props.title} />
      <Spacer flexible />
      {props.valueLabel ? (
        <NativeText tone="muted">{props.valueLabel}</NativeText>
      ) : null}
    </Row>
  );
}
