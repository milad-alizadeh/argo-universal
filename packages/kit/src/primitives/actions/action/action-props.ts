import type { KitProps } from '../../kit-props';

export type ActionProps = KitProps<'Action'>;

export type DeclaredPressProps = Extract<ActionProps, { onPress: unknown }>;

// A press Action runs `onPress`; an Action without one opens a submenu of its Section children. The Plugin renderer marks a Plugin's Actions so they cannot claim reserved shortcuts.
export type PressActionProps = DeclaredPressProps & { plugin?: boolean };

export type SubmenuActionProps = Exclude<ActionProps, DeclaredPressProps>;

export type ActionSectionProps = KitProps<'Action.Section'>;
