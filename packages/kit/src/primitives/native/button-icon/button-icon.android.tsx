import { RNHostView } from '@expo/ui';
import { Icon } from '@expo/ui/jetpack-compose';
import type { ReactElement } from 'react';
import { Pressable } from 'react-native';
import { materialImage } from '../../../symbols/material-images/material-images';
import type { ButtonIconProps, HostedPressProps } from './button-icon-props';

/*
 * The icon of a stock Compose control: its Material XML drawing in Expo UI's Compose Icon at Material's 24dp, as
 * Expo Router's Android toolbar draws one, so the whole control takes the tap. An icon without one (a Tabler icon,
 * or a Material name @expo/material-symbols lacks) is hosted from React Native and runs the press itself.
 */
export function ButtonIcon(props: ButtonIconProps): ReactElement {
  const source = materialImage(props.name);

  if (source) return <Icon source={source} tint={props.tint} />;

  return <HostedPress {...props} />;
}

/*
 * React Native content inside a Compose control: Expo UI's RNHostView takes every touch on it, so the Compose
 * control around it never sees a tap there, and a Pressable runs the control's press instead. As MenuView's Android
 * trigger, it adds no sound, focus or accessibility node of its own; the Compose control names it.
 */
export function HostedPress(props: HostedPressProps): ReactElement {
  return (
    <RNHostView matchContents>
      <Pressable
        onPress={props.onPress}
        disabled={props.disabled}
        android_disableSound
        focusable={false}
        accessible={false}
      >
        {props.children}
      </Pressable>
    </RNHostView>
  );
}
