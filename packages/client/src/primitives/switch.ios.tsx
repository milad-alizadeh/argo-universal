import { Host, Toggle } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  disabled,
  labelsHidden,
  tint,
  toggleStyle,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { usePrimitiveColor } from './primitive-color';
import type { SwitchProps } from './switch-props';

function Switch(props: SwitchProps): React.JSX.Element {
  const modifiers = useSwitchModifiers(props);
  return (
    <Host matchContents>
      <Toggle
        isOn={props.checked}
        onIsOnChange={props.onCheckedChange}
        modifiers={modifiers}
      />
    </Host>
  );
}

function useSwitchModifiers(
  props: SwitchProps,
): React.ComponentProps<typeof Toggle>['modifiers'] {
  const primary = usePrimitiveColor('text-primary');
  return [
    toggleStyle('switch'),
    labelsHidden(),
    disabled(!!props.disabled),
    ...switchLabel(props.accessibilityLabel),
    ...(primary === undefined ? [] : [tint(primary)]),
  ];
}

function switchLabel(
  label: string | undefined,
): ReturnType<typeof accessibilityLabel>[] {
  return label ? [accessibilityLabel(label)] : [];
}

export { Switch };
