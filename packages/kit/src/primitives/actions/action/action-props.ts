import type { KitProps } from '../../kit-props';

type KitAction = KitProps<'Action'>;

export type ActionProps = PressActionProps | SubmenuActionProps;

// A press Action runs `onPress`; an Action without one opens a submenu of its Section children.
export type PressActionProps = Extract<KitAction, { onPress: unknown }> & {
  // Count shown after the label in a menu.
  count?: string;
};

export type SubmenuActionProps = Exclude<KitAction, PressActionProps>;

export type ActionSectionProps = KitProps<'Action.Section'>;
