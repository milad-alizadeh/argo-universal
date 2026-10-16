import type { MenuAction } from '#primitives/overlays/menu';
import type { IconName } from '../../../symbols/icon-names';

export interface SplitButtonOption<Value extends string> {
  value: Value;
  label: string;
}

// The chevron picks what the button does, from options with one chosen.
interface SplitButtonOptions<Value extends string> {
  options: readonly SplitButtonOption<Value>[];
  value: Value;
  onValueChange: (value: Value) => void;
  actions?: never;
}

// The chevron opens actions of its own, beside the button's.
interface SplitButtonActions {
  actions: readonly MenuAction[];
  options?: never;
  value?: never;
  onValueChange?: never;
}

// What the chevron offers: options with one chosen, or actions.
export type SplitMenuItems<Value extends string = string> =
  | SplitButtonOptions<Value>
  | SplitButtonActions;

// What SplitButton passes to its chevron's menu.
export type SplitMenuProps<Value extends string = string> =
  SplitMenuItems<Value> & {
    menuLabel: string;
    // A filled chevron beside a filled button; otherwise a ghost one.
    primary?: boolean;
    disabled?: boolean;
    // Web only: a narrow layout's chevron matches its full-width button. Phones draw a native menu.
    narrow?: boolean;
    // `xs` is the compact header split: a divider between filled halves, and the group dims as one.
    size?: 'sm' | 'xs';
  };

// The button that acts, drawn by the split itself: Argo's button on the web, the native split's primary half on phones.
export type SplitButtonProps<Value extends string = string> =
  SplitMenuProps<Value> & {
    label: string;
    // The acting button's spoken name when its label says too little, such as a sign-in method's description.
    accessibilityLabel?: string;
    icon?: IconName;
    onPress?: () => void;
  };
