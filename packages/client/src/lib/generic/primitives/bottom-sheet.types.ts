import type { ReactElement, ReactNode } from 'react';
import type { PressableProps, StyleProp, ViewStyle } from 'react-native';

export interface BottomSheetProps {
  style?: StyleProp<ViewStyle>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClosed?: () => void;
  // Absent when the app opens the sheet itself, as a dialog on a narrow window does.
  trigger?: ReactElement<Pick<PressableProps, 'disabled'>>;
  // Absent when the content names the sheet with its own title.
  label?: string;
  children: ReactNode;
}
