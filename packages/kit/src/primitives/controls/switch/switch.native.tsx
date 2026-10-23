import { Switch as UniversalSwitch } from '@expo/ui';
import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import {
  accessibilityLabel,
  labelsHidden,
  toggleStyle,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { Platform } from 'react-native';
import { ControlHost } from '#primitives/native/native-control';
import type { SwitchProps } from './switch-props';

type SwitchModifiers = React.ComponentProps<
  typeof UniversalSwitch
>['modifiers'];

function Switch(props: SwitchProps): React.JSX.Element {
  return (
    <ControlHost matchContents>
      <UniversalSwitch
        value={props.value}
        onValueChange={props.onValueChange}
        disabled={props.disabled}
        modifiers={switchModifiers(props.accessibilityLabel)}
      />
    </ControlHost>
  );
}

// The switch draws no label, so SwiftUI hides the empty one and both platforms speak the given name.
function switchModifiers(label: string | undefined): SwitchModifiers {
  const spoken = label ? [label] : [];

  if (Platform.OS === 'android')
    return spoken.map((name) => semantics({ contentDescription: name }));

  return [
    toggleStyle('switch'),
    labelsHidden(),
    ...spoken.map((name) => accessibilityLabel(name)),
  ];
}

Switch satisfies React.ComponentType<SwitchProps>;

export { Switch };
