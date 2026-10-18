import type { MenuAction } from '#primitives/overlays/menu';
import type { KitProps } from '../../kit-props';

type Derived<Value extends string> = KitProps<'SplitButton', Value>;

export type SplitButtonOption<Value extends string> = Extract<
  Derived<Value>,
  { options: readonly unknown[] }
>['options'][number];

// Kit-only: custom web action content.
export type SplitButtonProps<Value extends string = string> = Derived<Value> & {
  actions?: readonly MenuAction[];
};

export type SplitMenuItems<Value extends string = string> =
  | Pick<
      Extract<Derived<Value>, { options: readonly unknown[] }>,
      'options' | 'value' | 'onValueChange' | 'actions'
    >
  | Pick<
      Extract<Derived<Value>, { actions: readonly unknown[] }>,
      'actions' | 'options' | 'value' | 'onValueChange'
    >;

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
