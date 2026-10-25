import { Switch } from '@expo/ui';
import type { ReactElement } from 'react';
import type { FieldGroupKitProps } from '../../kit-props';

// Expo UI's universal Switch on every platform, its title as the label; no leading icon.
export function FieldToggle(
  props: FieldGroupKitProps<'FieldGroup.Toggle'>,
): ReactElement {
  return (
    <Switch
      label={props.title}
      value={props.value}
      onValueChange={props.onValueChange}
      disabled={props.disabled}
    />
  );
}
