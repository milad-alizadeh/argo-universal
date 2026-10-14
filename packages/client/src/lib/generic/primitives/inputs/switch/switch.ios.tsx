import { Toggle } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  disabled,
  labelsHidden,
  toggleStyle,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { useNativeTheme } from '#lib/generic/native-theme';
import { ControlHost } from '#primitives/native/native-control';
import { optionalTint } from '#primitives/native/native-modifiers';
import type { SwitchProps } from './switch-props';

function Switch(props: SwitchProps): React.JSX.Element {
  const modifiers = useSwitchModifiers(props);

  return (
    <ControlHost matchContents>
      <Toggle
        isOn={props.value}
        onIsOnChange={props.onValueChange}
        modifiers={modifiers}
      />
    </ControlHost>
  );
}

// SwiftUI exposes only the tint; the off track, thumb and disabled look are the system's.
function useSwitchModifiers(
  props: SwitchProps,
): React.ComponentProps<typeof Toggle>['modifiers'] {
  const { accent } = useNativeTheme().colors;

  return [
    toggleStyle('switch'),
    labelsHidden(),
    disabled(!!props.disabled),
    ...switchLabel(props.accessibilityLabel),
    ...optionalTint(accent),
  ];
}

function switchLabel(
  label: string | undefined,
): ReturnType<typeof accessibilityLabel>[] {
  return label ? [accessibilityLabel(label)] : [];
}

Switch satisfies React.ComponentType<SwitchProps>;

export { Switch };
