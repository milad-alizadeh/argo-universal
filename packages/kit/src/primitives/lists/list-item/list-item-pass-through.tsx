import { createContext, use, type ReactNode } from 'react';
import { View } from 'react-native';
import type { RowPressProps } from './list-item-press-props';
import type { ListItemProps } from './list-item-props';

/*
 * A row with accessories draws its press under its content rather than around it: every lane lets presses fall
 * through to the row's press, and only the accessories take presses of their own.
 */
export const PassThroughContext = createContext(false);

// The row's press, for its accessories.
export const RowPressContext = createContext<RowPressProps | null>(null);

/*
 * The row's own press, for an accessory that must take the pointer, such as a tooltip's hover target, but has nothing
 * of its own to do when pressed.
 */
export const useListItemPress = (): RowPressProps['onPress'] =>
  use(RowPressContext)?.onPress;

/*
 * The accessories draw as they would anywhere else, so a List they open, such as a popover's, keeps its own presses;
 * they can still reach the row's press.
 */
export function AccessoryLane({
  children,
}: {
  children?: ReactNode;
}): ReactNode {
  return <PassThroughContext value={false}>{children}</PassThroughContext>;
}

export const hasAccessories = (
  props: Pick<ListItemProps, 'metaAccessories' | 'trailingAccessories'>,
): boolean =>
  [props.metaAccessories, props.trailingAccessories].some(
    (accessories) => accessories !== undefined,
  );

interface LaneEvents {
  pointerEvents?: 'none' | 'box-none';
  'aria-hidden'?: boolean;
}

const inert: LaneEvents = { pointerEvents: 'none', 'aria-hidden': true };

// A lane on the way to an accessory takes no press itself, but what it holds may.
export function useOpenLane(): LaneEvents {
  return use(PassThroughContext) ? { pointerEvents: 'box-none' } : {};
}

// A lane that holds no accessory, drawn on its own View: presses fall through it and a screen reader skips it.
export function useInertLane(): LaneEvents {
  return use(PassThroughContext) ? inert : {};
}

/*
 * A lane that holds no accessory: a press falls through to the row, and a screen reader hears the row's label
 * instead of the lane's text. Outside a row with accessories it draws its children as they are.
 */
export function InertLane({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}): ReactNode {
  if (!use(PassThroughContext) || !children) return children;

  return (
    <View {...inert} className={className}>
      {children}
    </View>
  );
}

/*
 * A part among a row's accessories that presses the row rather than taking its own press, such as plain text. It gives
 * up its width before the row's title does.
 */
export function ListItemInert({
  children,
}: {
  children?: ReactNode;
}): ReactNode {
  return (
    <View {...inert} className="min-w-0 shrink flex-row items-center">
      {children}
    </View>
  );
}
