import type { ColumnProps } from '@expo/ui';
import { clearSemantics, semantics } from '@expo/ui/jetpack-compose/modifiers';
import {
  accessibilityElement,
  accessibilityHidden,
  accessibilityLabel,
  accessibilityAddTraits,
} from '@expo/ui/swift-ui/modifiers';
import { Platform } from 'react-native';
import {
  groupedListItemName,
  type GroupedListItemProps,
} from './grouped-list-item-props';

type Modifiers = NonNullable<ColumnProps['modifiers']>;

type RowSlots = Pick<GroupedListItemProps, 'accessory' | 'detail' | 'control'>;

export type RowTextAccessibilityProps = RowSlots &
  Pick<GroupedListItemProps, 'accessibilityLabel' | 'onPress'>;

function hasRowControls(props: RowSlots): boolean {
  return !!props.accessory || !!props.detail || !!props.control;
}

function rowAccessibilityModifiers(props: GroupedListItemProps): Modifiers {
  if (Platform.OS !== 'ios') return androidAccessibility(props);

  return [
    ...rowElement(props),
    ...rowLabel(props),
    ...(props.selected ? [accessibilityAddTraits(['isSelected'])] : []),
  ];
}

// Ordinary Buttons already group their children; Slots must keep their own focus and actions.
function rowElement(
  props: RowSlots & Pick<GroupedListItemProps, 'onPress'>,
): Modifiers {
  if (hasRowControls(props)) return [accessibilityElement('contain')];

  return props.onPress ? [] : [accessibilityElement('ignore')];
}

function rowLabel(props: GroupedListItemProps): Modifiers {
  if (hasRowControls(props) && !namedGroup(props)) return [];

  return [accessibilityLabel(groupedListItemName(props))];
}

// Compose's installed semantics API has no selected/disabled state description for a Column.
function androidAccessibility(props: GroupedListItemProps): Modifiers {
  const name = hasRowControls(props)
    ? props.accessibilityLabel
    : groupedListItemName(props);

  const description = [name, ...androidStates(props)]
    .filter(Boolean)
    .join(', ');

  return description ? [semantics({ contentDescription: description })] : [];
}

export function rowHeadlineAccessibility(
  props: RowTextAccessibilityProps,
): Modifiers {
  return hiddenTextModifiers(
    !!props.control || !!props.detail || namedGroup(props),
    props,
  );
}

export function rowValueAccessibility(
  props: RowTextAccessibilityProps,
): Modifiers {
  return hiddenTextModifiers(!!props.detail || namedGroup(props), props);
}

function androidStates(
  props: Pick<GroupedListItemProps, 'selected' | 'disabled'>,
): (string | undefined)[] {
  return [
    props.selected ? 'Selected' : undefined,
    props.disabled ? 'Disabled' : undefined,
  ];
}

function namedGroup(props: RowTextAccessibilityProps): boolean {
  return hasRowControls(props) && hasGroupName(props);
}

function hasGroupName(
  props: Pick<GroupedListItemProps, 'accessibilityLabel' | 'onPress'>,
): boolean {
  if (props.accessibilityLabel) return true;

  return Platform.OS === 'ios' && !!props.onPress;
}

function hiddenTextModifiers(shouldHide: boolean, props: RowSlots): Modifiers {
  if (Platform.OS === 'ios') return shouldHide ? [accessibilityHidden()] : [];

  return androidHidden(shouldHide, props);
}

function androidHidden(shouldHide: boolean, props: RowSlots): Modifiers {
  return shouldHide || !hasRowControls(props) ? [clearSemantics()] : [];
}

export function rowContainerAccessibility(
  props: GroupedListItemProps,
): Modifiers {
  if (Platform.OS === 'ios' && rowHasHeadlineAction(props))
    return [accessibilityElement('contain')];

  return rowAccessibilityModifiers(props);
}

export function rowActionAccessibility(props: GroupedListItemProps): Modifiers {
  return [
    accessibilityLabel(groupedListItemName(props)),
    ...(props.selected ? [accessibilityAddTraits(['isSelected'])] : []),
  ];
}

export function rowDisclosureAccessibility(): Modifiers {
  return Platform.OS === 'ios' ? [accessibilityHidden()] : [];
}

export function rowHasHeadlineAction(
  props: RowSlots & Pick<GroupedListItemProps, 'onPress'>,
): boolean {
  return !!props.onPress && hasRowControls(props);
}

export function rowUsesStockButton(
  props: RowSlots & Pick<GroupedListItemProps, 'onPress'>,
): boolean {
  return Platform.OS === 'ios' && !!props.onPress && !hasRowControls(props);
}
