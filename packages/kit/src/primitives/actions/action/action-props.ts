import type { KitProps } from '../../kit-props';

export type ActionProps = KitProps<'Action'>;

// A press Action runs `onPress`; an Action without one opens a submenu of its Section children.
export type PressActionProps = Extract<ActionProps, { onPress: unknown }>;

export type SubmenuActionProps = Exclude<ActionProps, PressActionProps>;

export type ActionSectionProps = KitProps<'Action.Section'>;
