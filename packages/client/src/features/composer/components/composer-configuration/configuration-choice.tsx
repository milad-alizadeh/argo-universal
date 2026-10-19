import type { ReactElement } from 'react';
import { ListItem } from '#primitives/lists/list-item';

interface ChoiceProps {
  selected: boolean;
  label: string;
  description?: string;
  onPress: () => void;
  dangerous?: boolean;
  leading?: ReactElement;
  accessibilityLabel?: string;
}

export function ConfigurationChoice(props: ChoiceProps): ReactElement {
  return (
    <ListItem
      id={props.label}
      title={props.label}
      subtitle={props.description}
      leading={props.leading}
      selected={props.selected}
      onPress={props.onPress}
      accessibilityLabel={props.accessibilityLabel}
      tone={props.dangerous ? 'danger' : undefined}
    />
  );
}
