// The universal Switch hides Compose's public colour props; keep the stock control with Argo tokens.
import { Switch as MaterialSwitch } from '@expo/ui/jetpack-compose';
import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import type { ReactElement } from 'react';
import { useMaterialPalette } from '#primitives/native/material-palette';
import { ControlHost } from '#primitives/native/native-control';
import type { SwitchProps } from './switch-props';

export function Switch(props: SwitchProps): ReactElement {
  return (
    <ControlHost matchContents>
      <MaterialSwitch
        {...controlProps(props)}
        colors={useMaterialPalette().switchColors}
      />
    </ControlHost>
  );
}

function controlProps(
  props: SwitchProps,
): React.ComponentProps<typeof MaterialSwitch> {
  return {
    value: props.value,
    enabled: !props.disabled,
    onCheckedChange: props.onValueChange,
    modifiers: props.accessibilityLabel
      ? [semantics({ contentDescription: props.accessibilityLabel })]
      : [],
  };
}
