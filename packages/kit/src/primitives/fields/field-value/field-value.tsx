import { Row, Spacer } from '@expo/ui';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { NativeText } from '#primitives/content/native-text';
import { RowTitle } from '#primitives/fields/field-row';
import type { FieldGroupKitProps } from '../../kit-props';

type FieldValueProps = FieldGroupKitProps<'FieldGroup.Value'>;

// The spoken label of the pair, "<title>, <value>"; a row with no value yet is just its title.
const spokenLabel = (props: FieldValueProps): string =>
  props.value ? `${props.title}, ${props.value}` : props.title;

/*
 * The title, then the value at the trailing edge in the muted tone, as iOS's LabeledContent draws it.
 * Assistive tech reads the pair as one group.
 */
export function FieldValue(props: FieldValueProps): ReactElement {
  return (
    <View accessible role="group" accessibilityLabel={spokenLabel(props)}>
      <Row alignment="center">
        <RowTitle {...props} />
        <Spacer flexible />
        <NativeText tone="muted">{props.value}</NativeText>
      </Row>
    </View>
  );
}
