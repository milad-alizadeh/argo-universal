import { Row, Spacer } from '@expo/ui';
import type { ReactElement } from 'react';
import { Pressable, View } from 'react-native';
import { useNativeTheme } from '#kit/native-theme';
import { NativeText } from '#primitives/content/native-text';
import {
  RowTitle,
  rowPressTargetClassName,
  useRowPressable,
} from '#primitives/fields/field-row';
import { NativeIcon } from '../../../symbols/native-icon';
import type { FieldGroupKitProps } from '../../kit-props';

type FieldLinkProps = FieldGroupKitProps<'FieldGroup.Link'>;

/*
 * A row that opens a page ends in what the page holds, muted, then the kit's disclosure chevron, which the web draws
 * itself (ADR-0041). Expo's web Row presses without a role, so the whole row is a link named by its title and value.
 */
export function FieldLink(props: FieldLinkProps): ReactElement {
  useRowPressable(!props.disabled);

  return (
    <Pressable
      role="link"
      aria-label={spokenLabel(props)}
      disabled={props.disabled}
      onPress={props.onPress}
      onKeyDown={(event) => followOnEnter(event, props)}
      className={rowPressTargetClassName}
    >
      <LinkRow {...props} />
    </Pressable>
  );
}

const LinkRow = (props: FieldLinkProps): ReactElement => (
  <Row alignment="center">
    <RowTitle {...props} />
    <Spacer flexible />
    {props.value ? <NativeText tone="muted">{props.value}</NativeText> : null}
    <Chevron />
  </Row>
);

// React Native Web leaves Enter on a link to the browser, which follows only an anchor's href; this row has none.
function followOnEnter(
  event: { nativeEvent: { key: string } },
  props: FieldLinkProps,
): void {
  if (event.nativeEvent.key === 'Enter' && !props.disabled) props.onPress();
}

const spokenLabel = (props: FieldLinkProps): string =>
  props.value ? `${props.title}, ${props.value}` : props.title;

function Chevron(): ReactElement {
  const color = useNativeTheme().colors.tertiary;

  return (
    <View className={chevronEnd}>
      <NativeIcon name="web-disclosure" size="sm" color={color} />
    </View>
  );
}

/*
 * The chevron's stroke ends three eighths of its box short of the right edge; pulling the box out by that much lines
 * the stroke's end up with the values in the rows above, as iOS does (to the nearest spacing step).
 */
const chevronEnd = '-mr-2 wide:-mr-1.5';
