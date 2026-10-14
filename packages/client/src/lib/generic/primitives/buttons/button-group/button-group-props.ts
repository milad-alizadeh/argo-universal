import type { ReactNode } from 'react';
import type { ViewProps } from 'react-native';

export interface ButtonGroupProps extends Pick<ViewProps, 'onLayout'> {
  // Each child passes className on to its Button.
  children: ReactNode;
  className?: string;
}
