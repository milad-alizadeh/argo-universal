import type { ReactElement, ReactNode } from 'react';
import type { SheetScreenAction } from '#primitives/overlays/sheet';
import type { SizeClassValue } from '../../../use-size-class/size-class-value';

export interface DrillSearch {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
}

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
  // Desktop: the choices open beside the row on its right even though the caller drew the trigger, as a picker row in a popover does.
  beside?: boolean;
  // The pushed page's one header action; a popover has no header, so its choices draw the action themselves.
  action?: SheetScreenAction;
  // The search a pushed page holds in its header, where the platform puts it; a popover or Sheet page draws its own field.
  search?: DrillSearch;
  // `inHeader` is true where the page's header holds `search`.
  children: (close: () => void, inHeader: boolean) => ReactNode;
}
