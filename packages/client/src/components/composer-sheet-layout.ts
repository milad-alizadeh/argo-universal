import type { ReactElement, ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ButtonProps } from '#primitives/button';

export interface ComposerSheetProps {
  style?: StyleProp<ViewStyle>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Called once the sheet has left the screen after closing.
  onClosed: () => void;
  trigger: ReactElement<ButtonProps>;
  label: string;
  children: ReactNode;
}

const minimumBottomPadding = 16;

export function useComposerSheetBottomPadding(): number {
  return Math.max(minimumBottomPadding, useSafeAreaInsets().bottom);
}
