import type { ReactElement } from 'react';
import { Text } from 'react-native';
import { Icon } from '#primitives/content/icon';
import type { NativeIconProps } from './native-icon';

// The web draws no Expo UI Icon, so it draws Argo's own, coloured by the same value as the label beside it.
export function NativeIconFallback(props: NativeIconProps): ReactElement {
  return (
    <Text style={{ color: props.color }}>
      <Icon
        name={props.name}
        role={props.role}
        filled={props.filled}
        className="text-inherit"
      />
    </Text>
  );
}
