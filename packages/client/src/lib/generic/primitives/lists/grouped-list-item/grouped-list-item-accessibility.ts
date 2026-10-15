import type { ColumnProps } from '@expo/ui';
import { semantics } from '@expo/ui/jetpack-compose/modifiers';
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

const ios = Platform.OS === 'ios';

function hasControls(props: GroupedListItemProps): boolean {
  return !!props.accessory || !!props.detail || !!props.control;
}

// Embedded controls retain their own focus and activation; an ordinary row has one name.
export function rowAccessibilityModifiers(
  props: GroupedListItemProps,
): Modifiers {
  if (!ios) return androidRowAccessibility(props);

  if (hasControls(props))
    return [...slotAccessibility(props), ...selectedTrait(props.selected)];

  return [
    ...rowElement(props),
    accessibilityLabel(groupedListItemName(props)),
    ...selectedTrait(props.selected),
  ];
}

// Stock Buttons supply their trait and grouping. Static rows need one explicit element.
function rowElement(props: GroupedListItemProps): Modifiers {
  return props.onPress ? [] : [accessibilityElement('ignore')];
}

function selectedTrait(selected: boolean | undefined): Modifiers {
  return selected ? [accessibilityAddTraits(['isSelected'])] : [];
}

// Compose's exposed semantics API has no selected/disabled properties for a generic row.
function androidRowAccessibility(props: GroupedListItemProps): Modifiers {
  const states = androidStates(props);

  const name = hasControls(props)
    ? [props.accessibilityLabel, states].filter(Boolean).join(', ')
    : [groupedListItemName(props), states].filter(Boolean).join(', ');

  return name ? [semantics({ contentDescription: name })] : [];
}

function androidStates(props: GroupedListItemProps): string {
  return [
    props.selected ? 'Selected' : undefined,
    props.disabled ? 'Disabled' : undefined,
  ]
    .filter(Boolean)
    .join(', ');
}

// A native Switch or detail Slider already supplies the field's accessible label.
export function rowLabelAccessibility(props: GroupedListItemProps): Modifiers {
  return ios ? [accessibilityHidden(hideLabel(props))] : [];
}

export function rowContentAccessibility(
  props: GroupedListItemProps,
): Modifiers {
  return ios ? [accessibilityHidden(hideContent(props))] : [];
}

// Never hide an independent trailing Slot while suppressing a detail control's duplicate text.
function hideContent(props: GroupedListItemProps): boolean {
  return !!props.detail && !props.control && !props.accessory;
}

function slotAccessibility(props: GroupedListItemProps): Modifiers {
  const label = props.accessibilityLabel;

  return label
    ? [accessibilityElement('contain'), accessibilityLabel(label)]
    : [accessibilityElement('contain')];
}

function hideLabel(props: GroupedListItemProps): boolean {
  return !!props.control || (!!props.accessory && !!props.accessibilityLabel);
}
