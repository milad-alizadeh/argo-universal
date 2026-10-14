import type { ReactElement } from 'react';
import type { MenuAction } from '#primitives/overlays/menu';

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

// What SplitButton passes to its chevron's menu or Sheet; ButtonGroup sets className on it.
export type SplitMenuProps<Value extends string = string> =
  SplitMenuItems<Value> & {
    menuLabel: string;
    // A filled chevron beside a filled button; otherwise a ghost one.
    primary?: boolean;
    disabled?: boolean;
    // A narrow layout picks from a Sheet instead of a menu.
    narrow?: boolean;
    // `xs` is the compact header split: a divider between filled halves, and the group dims as one.
    size?: 'sm' | 'xs';
    className?: string;
  };

export type SplitButtonProps<Value extends string = string> =
  SplitMenuProps<Value> & {
    // The button that acts; it passes className on to its Button.
    children: ReactElement<{ className?: string }>;
  };
