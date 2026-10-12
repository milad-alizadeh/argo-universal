import type { HStack } from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityLabel,
  accessibilityAddTraits,
} from '@expo/ui/swift-ui/modifiers';
import type { ComponentProps } from 'react';
import { listItemName, type ListItemProps } from '../../fields/field-props';

export function rowAccessibility(props: ListItemProps): 'contain' | 'ignore' {
  if (props.onPress) return 'ignore';
  return hasControls(props) ? 'contain' : 'ignore';
}

function hasControls(props: ListItemProps): boolean {
  return !!props.accessory || !!props.detail || !!props.control;
}

export function rowAccessibilityModifiers(
  props: ListItemProps,
): NonNullable<ComponentProps<typeof HStack>['modifiers']> {
  if (props.control || props.detail) return [];
  return [
    accessibilityElement(rowAccessibility(props)),
    accessibilityLabel(listItemName(props)),
    selectedTrait(props.selected),
  ];
}

function selectedTrait(
  selected: boolean | undefined,
): ReturnType<typeof accessibilityAddTraits> {
  return accessibilityAddTraits(selected ? ['isSelected'] : []);
}
