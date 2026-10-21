import type { ReactElement, ReactNode } from 'react';
import type { ColorValue } from 'react-native';
import type { IconSymbol } from '../../../symbols/icon-symbol';

export interface HostedPressProps {
  onPress: () => void;
  disabled?: boolean;
  children: ReactNode;
}

export interface ButtonIconProps extends HostedPressProps {
  name: IconSymbol;
  // Unset, the icon takes the control's content colour.
  tint?: ColorValue;
  // The React Native drawing of an icon Material has no XML drawing for.
  children: ReactElement;
}
