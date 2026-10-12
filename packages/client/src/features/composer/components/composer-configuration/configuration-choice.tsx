import type * as React from 'react';
import { SelectedCheck } from '#primitives/display/selected-check';
import { ListItem } from '#primitives/lists/list-item/list-item';

export function ConfigurationChoice({
  selected,
  label,
  description,
  onPress,
  dangerous,
  leading,
  accessibilityLabel,
}: {
  selected: boolean;
  label: string;
  description?: string;
  onPress: () => void;
  dangerous?: boolean;
  leading?: React.ReactElement;
  accessibilityLabel?: string;
}): React.JSX.Element {
  return (
    <ListItem
      title={label}
      accessibilityLabel={accessibilityLabel ?? label}
      subtitle={description ? { text: description } : undefined}
      leading={leading}
      selected={selected}
      role="button"
      disclosure={false}
      onPress={onPress}
      tone={dangerous ? 'destructive' : undefined}
      accessory={selected ? <SelectedCheck /> : undefined}
    />
  );
}
