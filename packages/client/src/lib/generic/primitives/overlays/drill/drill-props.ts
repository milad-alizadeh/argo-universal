import type { ReactElement, ReactNode } from 'react';
import type { SizeClassValue } from '../../../use-size-class/size-class-value';

export interface DrillProps {
  label: string;
  value?: SizeClassValue<string | undefined>;
  valueLeading?: ReactElement;
  disabled?: boolean;
  title: string;
  trigger?: ReactElement<{ disabled?: boolean; onPress?: () => void }>;
  contentScrolls?: boolean;
  onClose?: () => void;
  children: (close: () => void) => ReactNode;
}
