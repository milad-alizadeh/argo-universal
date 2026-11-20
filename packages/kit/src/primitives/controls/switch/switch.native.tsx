import { Switch as UniversalSwitch } from '@expo/ui';
import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import { accessibilityLabel } from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';
import { Platform } from 'react-native';
import { ControlHost } from '#primitives/native/native-control';
import type { SwitchProps } from './switch-props';

// VoiceOver and TalkBack hear the name through each platform's own modifier.
const spoken = (name: string): React.ComponentProps<typeof UniversalSwitch>['modifiers'] =>
  Platform.OS === 'android'
    ? [semantics({ contentDescription: name })]
    : [accessibilityLabel(name)];

/*
 * Expo UI's universal Switch on iOS and Android, in a Host of its own unless it already sits in one, such as a
 * FieldGroup row's.
 */
export type { SwitchProps } from './switch-props';

export function Switch(props: SwitchProps): ReactElement {
  return (
    <ControlHost matchContents>
      <UniversalSwitch
        value={props.value}
        onValueChange={props.onValueChange}
        disabled={props.disabled}
        modifiers={spoken(props.accessibilityLabel)}
      />
    </ControlHost>
  );
}
