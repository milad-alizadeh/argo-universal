import type { ReactElement, ReactNode } from 'react';
import type { PressableProps, StyleProp, ViewStyle } from 'react-native';

export interface BottomSheetProps {
  style?: StyleProp<ViewStyle>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClosed?: () => void;
  trigger: ReactElement<Pick<PressableProps, 'disabled'>>;
  label: string;
  children: ReactNode;
}
