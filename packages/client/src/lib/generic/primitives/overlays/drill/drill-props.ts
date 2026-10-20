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
  // The rows the pushed page stands in for while it slides in; a picker passes its own choices.
  placeholder?: ReactNode;
  /*
   * When the choices are drawn. "lazy", the default, draws them as the page is pushed. "eager" hands them
   * to the sheet once it has opened, so the push that follows has nothing to lay out: a list whose rows
   * are known before anyone asks for them, such as the Agents or an Agent's models, is drawn once and
   * slid to from then on.
   */
  mount?: 'lazy' | 'eager';
  onClose?: () => void;
  // Desktop: a pick leaves the choices and their menu open, so several picks run in a row; a click outside or Escape closes them. Phones go back as before.
  keepOpen?: boolean;
  children: (close: () => void) => ReactNode;
}
