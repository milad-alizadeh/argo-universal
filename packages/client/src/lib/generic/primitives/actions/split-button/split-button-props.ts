import type { ReactNode } from 'react';
import type { MenuAction } from '#primitives/overlays/menu';
import type { KitProps } from '../../kit-props';

type Derived<Value extends string> = KitProps<'SplitButton', Value>;

export type SplitButtonOption<Value extends string> = Extract<
  Derived<Value>,
  { options: readonly unknown[] }
>['options'][number];

// Kit-only: Argo's own callers pass menu actions as data, with custom web content.
export type SplitButtonProps<Value extends string = string> = Derived<Value> & {
  actions?: readonly MenuAction[];
};

type Choices<Value extends string> = Extract<
  Derived<Value>,
  { options: readonly unknown[] }
>;

// What the chevron's menu lists: the choices, or the actions.
export type SplitMenuRows<Value extends string = string> =
  | Pick<Choices<Value>, 'options' | 'value' | 'onValueChange'>
  | { actions: readonly MenuAction[] };

// The menu's rows: choices, actions given as data, or keyed Action children.
export type SplitMenuItems<Value extends string = string> =
  | Pick<Choices<Value>, 'options' | 'value' | 'onValueChange' | 'actions'>
  | {
      actions?: readonly MenuAction[];
      children?: ReactNode;
      options?: never;
      value?: never;
      onValueChange?: never;
    };

type SplitMenuLook<Value extends string> = Pick<
  Derived<Value>,
  'menuLabel' | 'primary' | 'disabled' | 'size'
> & { narrow?: boolean };

export type SplitMenuProps<Value extends string = string> =
  SplitMenuItems<Value> & SplitMenuLook<Value>;

type Resolved<Props> = Props extends object
  ? Omit<Props, 'fullWidth'> & { narrow?: boolean }
  : Props;

export type ResolvedSplitProps<Value extends string = string> = Resolved<
  SplitButtonProps<Value>
>;
