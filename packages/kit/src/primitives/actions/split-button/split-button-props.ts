import type { ReactNode } from 'react';
import type { MenuAction } from '#primitives/overlays/menu';
import type { KitProps } from '../../kit-props';

type Derived<Value extends string> = KitProps<'SplitButton', Value>;

type Choices<Value extends string> = Extract<
  Derived<Value>,
  { options: readonly unknown[] }
>;

export type SplitButtonOption<Value extends string> =
  Choices<Value>['options'][number];

// Kit-only: Argo's own callers pass menu actions as data, with custom web content.
export type SplitButtonProps<Value extends string = string> = Derived<Value> & {
  actions?: readonly MenuAction[];
  children?: ReactNode;
};

// What the split offers besides its button: the choices, or the actions.
export type SplitRows<Value extends string = string> =
  | Pick<Choices<Value>, 'options' | 'value' | 'onValueChange'>
  | { actions: readonly MenuAction[] };

// The split's props once its width is resolved: `narrow` fills the row.
export type LaidSplitProps<Value extends string = string> =
  SplitButtonProps<Value> & { narrow: boolean };
