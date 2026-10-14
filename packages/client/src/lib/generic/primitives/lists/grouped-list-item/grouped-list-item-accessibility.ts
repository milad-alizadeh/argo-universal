import type { HStack } from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityLabel,
  accessibilityAddTraits,
} from '@expo/ui/swift-ui/modifiers';
import type { ComponentProps } from 'react';
import {
  groupedListItemName,
  type GroupedListItemProps,
} from './grouped-list-item-props';

export function rowAccessibility(
  props: GroupedListItemProps,
): 'contain' | 'ignore' {
  if (props.onPress) return 'ignore';

  return hasControls(props) ? 'contain' : 'ignore';
}

function hasControls(props: GroupedListItemProps): boolean {
  return !!props.accessory || !!props.detail || !!props.control;
}

export function rowAccessibilityModifiers(
  props: GroupedListItemProps,
): NonNullable<ComponentProps<typeof HStack>['modifiers']> {
  if (props.control || props.detail) return [];

  return [
    ...rowElement(props),
    accessibilityLabel(groupedListItemName(props)),
    selectedTrait(props.selected),
  ];
}

// A pressable row's Button is already one element; wrapping it again drops the list's press highlight.
function rowElement(
  props: GroupedListItemProps,
): ReturnType<typeof accessibilityElement>[] {
  if (props.onPress) return [];

  return [accessibilityElement(rowAccessibility(props))];
}

function selectedTrait(
  selected: boolean | undefined,
): ReturnType<typeof accessibilityAddTraits> {
  return accessibilityAddTraits(selected ? ['isSelected'] : []);
}
