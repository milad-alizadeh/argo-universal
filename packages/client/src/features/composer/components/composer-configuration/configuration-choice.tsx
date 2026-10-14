import type * as React from 'react';
import { SelectedCheck } from '#primitives/display/selected-check';
import { ListItem } from '#primitives/lists/list-item/list-item-view';

interface ChoiceProps {
  selected: boolean;
  label: string;
  description?: string;
  onPress: () => void;
  dangerous?: boolean;
  leading?: React.ReactElement;
  accessibilityLabel?: string;
}

export function ConfigurationChoice(props: ChoiceProps): React.JSX.Element {
  return <ListItem {...choiceRowProps(props)} />;
}

function choiceRowProps(
  props: ChoiceProps,
): React.ComponentProps<typeof ListItem> {
  return {
    ...choiceContent(props),
    leading: props.leading,
    selected: props.selected,
    role: 'button',
    disclosure: false,
    onPress: props.onPress,
    tone: props.dangerous ? 'destructive' : undefined,
    accessory: props.selected ? <SelectedCheck /> : undefined,
  };
}

function choiceContent(
  props: ChoiceProps,
): React.ComponentProps<typeof ListItem> {
  return {
    title: props.label,
    accessibilityLabel: props.accessibilityLabel ?? props.label,
    subtitle: props.description ? { text: props.description } : undefined,
  };
}
