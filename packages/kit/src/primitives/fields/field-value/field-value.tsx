import { Row, Spacer } from '@expo/ui';
import type { ReactElement } from 'react';
import { View, type ViewStyle } from 'react-native';
import { NativeText } from '#primitives/content/native-text';
import { RowTitle } from '#primitives/fields/field-row';
import { SkeletonBar } from '../../../list-skeleton';
import type { FieldGroupKitProps } from '../../kit-props';

type FieldValueProps = FieldGroupKitProps<'FieldGroup.Value'>;

// The spoken label of the pair, "<title>, <value>"; a row with no value yet is just its title.
const spokenLabel = (props: FieldValueProps): string =>
  props.value ? `${props.title}, ${props.value}` : props.title;

// The title keeps its own width and the value takes what is left, wrapping, so a long value never squeezes the title away.
const titleStyle: ViewStyle = { flexShrink: 0 };

// The least space between the title and a value long enough to wrap beside it.
const valueGap = 16;

const valueStyle: ViewStyle = { flexShrink: 1, minWidth: 0 };

/*
 * The title, then the value at the trailing edge in the muted tone, as iOS's LabeledContent draws it.
 * Assistive tech reads the pair as one group.
 */
export function FieldValue(props: FieldValueProps): ReactElement {
  if (props.loading) return <Placeholder {...props} />;

  return (
    <View accessible role="group" accessibilityLabel={spokenLabel(props)}>
      <TitleAndValue {...props} />
    </View>
  );
}

function TitleAndValue(props: FieldValueProps): ReactElement {
  return (
    <Row alignment="center" spacing={valueGap}>
      <View style={titleStyle}>
        <RowTitle {...props} />
      </View>
      <Spacer flexible />
      <View style={valueStyle}>
        <NativeText tone="muted">{props.value}</NativeText>
      </View>
    </Row>
  );
}

// A bar as wide as the title it stands in for; none of it is read, and the row is not a group of words.
function Placeholder(props: FieldValueProps): ReactElement {
  return (
    <View aria-hidden>
      <SkeletonBar text={props.title} />
    </View>
  );
}
