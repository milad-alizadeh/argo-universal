import { Row, Spacer } from '@expo/ui';
import type { ReactElement } from 'react';
import { Pressable, View } from 'react-native';
import { useNativeTheme } from '#kit/native-theme';
import { cn } from '#kit/utils';
import { NativeText } from '#primitives/content/native-text';
import {
  RowTitle,
  rowPressTargetClassName,
  useRowPressable,
} from '#primitives/fields/field-row';
import { NativeIcon } from '../../../symbols/native-icon';
import type { FieldGroupKitProps } from '../../kit-props';

// Radix's Trigger hands its child the anchor ref and popup state, as a Drill's popover opens beside the row.
type Anchor = Pick<
  React.ComponentProps<typeof Pressable>,
  'ref' | 'aria-expanded'
> & {
  'aria-haspopup'?: 'dialog';
  'aria-controls'?: string;
};

type FieldLinkProps = FieldGroupKitProps<'FieldGroup.Link'> & Anchor;

/*
 * A row that opens a page ends in what the page holds, muted, then the kit's disclosure chevron, which the web draws
 * itself (ADR-0041). Expo's web Row presses without a role, so the whole row is a link named by its title and value.
 * A row with `action` opens no page: it is a button and ends in no chevron.
 * A popover's Trigger may anchor on it, so the web row passes the anchor ref and popup state on to its Pressable.
 */
export function FieldLink(props: FieldLinkProps): ReactElement {
  useRowPressable(!props.disabled);

  return (
    <Pressable {...linkProps(props)}>
      <LinkRow {...props} />
    </Pressable>
  );
}

type Attributes = React.ComponentProps<typeof Pressable> & Anchor;

const linkProps = (props: FieldLinkProps): Attributes => ({
  ref: props.ref,
  'aria-haspopup': props['aria-haspopup'],
  'aria-expanded': props['aria-expanded'],
  'aria-controls': props['aria-controls'],
  role: props.action ? 'button' : 'link',
  'aria-label': spokenLabel(props),
  disabled: props.disabled,
  onPress: props.onPress,
  onKeyDown: (event) => followOnEnter(event, props),
  className: cn(rowPressTargetClassName, props.disabled && disabledClassName),
});

// A disabled row dims to half, as the web menu's disabled items do.
const disabledClassName = 'opacity-50';

const LinkRow = (props: FieldLinkProps): ReactElement => (
  <Row alignment="center">
    <View className="min-w-0 shrink">
      <RowTitle {...props} />
    </View>
    <Spacer flexible />
    {props.value ? <LinkValue value={props.value} /> : null}
    {props.action ? null : <Chevron />}
  </Row>
);

// A long value takes one line and truncates before the title does (#1750): its shrink factor outweighs the title's 1, so the row squeezes the value first.
const LinkValue = (props: { value: string }): ReactElement => (
  <View className="min-w-0 shrink-99">
    <NativeText tone="muted" numberOfLines={1}>
      {props.value}
    </NativeText>
  </View>
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
