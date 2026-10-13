import type { ReactElement, ReactNode } from 'react';
import type { PressableProps, StyleProp, ViewStyle } from 'react-native';

export interface BottomSheetProps {
  style?: StyleProp<ViewStyle>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClosed?: () => void;
  // Absent when the app opens the sheet itself, as a dialog on a narrow window does.
  trigger?: ReactElement<Pick<PressableProps, 'disabled' | 'onPress'>>;
  // Absent when the content names the sheet with its own title.
  label?: string;
  // The sheet rises only as tall as its content, as a dialog's does, instead of to fixed heights.
  fit?: boolean;
  // The child owns scrolling, as a native FieldGroup does.
  contentScrolls?: boolean;
  surface?: 'popover' | 'sidebar';
  // False while the content holds unsaved input: a swipe, the backdrop, Escape or Back leave the sheet open.
  dismissible?: boolean;
  footer?: ReactNode;
  expandable?: boolean;
  initialSize?: 'compact' | 'medium' | 'expanded';
  children: ReactNode;
}
