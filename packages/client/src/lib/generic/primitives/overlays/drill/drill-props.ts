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
  // Desktop: a pick leaves the choices and their menu open, so several picks run in a row; a click outside or Escape closes them. Phones go back as before.
  keepOpen?: boolean;
  children: (close: () => void) => ReactNode;
}
