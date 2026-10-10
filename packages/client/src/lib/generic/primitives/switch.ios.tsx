import { Toggle } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  disabled,
  labelsHidden,
  toggleStyle,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { useNativeTheme } from '#lib/generic/native-theme';
import { Host } from './host';
import { optionalTint } from './swift-tint';
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

// SwiftUI exposes only the tint; the off track, thumb and disabled look are the system's.
function useSwitchModifiers(
  props: SwitchProps,
): React.ComponentProps<typeof Toggle>['modifiers'] {
  const { tint } = useNativeTheme().colors;
  return [
    toggleStyle('switch'),
    labelsHidden(),
    disabled(!!props.disabled),
    ...switchLabel(props.accessibilityLabel),
    ...optionalTint(tint),
  ];
}

function switchLabel(
  label: string | undefined,
): ReturnType<typeof accessibilityLabel>[] {
  return label ? [accessibilityLabel(label)] : [];
}

export { Switch };
