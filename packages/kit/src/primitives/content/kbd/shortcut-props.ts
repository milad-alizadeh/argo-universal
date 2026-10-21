import type { KitProps } from '../../kit-props';

// Only a press Action takes a shortcut; a submenu opens instead.
export type ActionShortcut = NonNullable<
  Extract<KitProps<'Action'>, { onPress: unknown }>['shortcut']
>;
