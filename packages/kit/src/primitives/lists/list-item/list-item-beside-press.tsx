import type { ReactElement } from 'react';
import { Pressable, View, type ViewProps } from 'react-native';
import { cn } from '../../../utils';
import {
  hasAccessories,
  PassThroughContext,
  RowPressContext,
} from './list-item-pass-through';
import { usePressLanes } from './list-item-press-class';
import type { DrawingProps, RowPressProps } from './list-item-press-props';
import { ItemContentSlots } from './list-item-slots';
import { useFoldButton } from './list-item-tree';

/*
 * A row with accessories, or a parent's chevron, draws its press as an empty layer under its content, so the web never
 * nests their buttons in the row's and a screen reader reaches each accessory after the row. The content lets every
 * press but an accessory's or the chevron's fall through to the row's press.
 */
interface BesidePressProps {
  props: DrawingProps;
  press: RowPressProps;
}

// Accessories and a parent's chevron are buttons of their own, which the web must not nest in the row's.
function usePassThrough(props: DrawingProps): boolean {
  const folds = useFoldButton();

  return hasAccessories(props) || folds;
}

// Whether the row's press goes beside its content, and whether its lanes let presses through to it.
export interface BesideDrawing {
  beside: boolean;
  through: boolean;
}

// Keep the row's press target mounted when asynchronous accessories appear.
export function useBesidePress(
  props: DrawingProps,
  tile: boolean,
): BesideDrawing {
  const through = usePassThrough(props);

  return { through, beside: through || pressesBeside(props, tile) };
}

const pressesBeside = (props: DrawingProps, tile: boolean): boolean =>
  !tile && [props.onPress, props.href].some(Boolean);

// The row's press, beside its content or around it; the same press target stays while an asynchronous accessory arrives during a click.
export function rowPress(
  props: DrawingProps,
  press: RowPressProps,
  beside: BesideDrawing,
): ReactElement {
  if (beside.beside) return besidePress({ props, press }, beside.through);

  if (pressesNothing(press)) return inertRow(props, press);

  return (
    <Pressable {...press}>
      <ItemContentSlots {...props} />
    </Pressable>
  );
}

// Handlers that only paint the row, never act: its hover look, its focus ring and its layout.
const paintOnly = new Set([
  'onHoverIn',
  'onHoverOut',
  'onFocus',
  'onBlur',
  'onLayout',
]);

// A link or a popup acts like a handler does.
const actingProps = new Set(['href', 'aria-haspopup']);

const actingKey = (key: string): boolean =>
  actingProps.has(key) || (key.startsWith('on') && !paintOnly.has(key));

// Every way a row's press can act: any handler it was given (a press, a long press, a key, a menu's pointer), a link or a popup.
const acts = ([key, value]: [string, unknown]): boolean =>
  Boolean(value) && actingKey(key);

const pressesNothing = (press: RowPressProps): boolean =>
  press.role === 'group' && !Object.entries(press).some(acts);

/*
 * A row that presses nothing is a named group, drawn without a press: the web's press stops every click it sees, so a
 * row with none of its own would still swallow the press of what holds it, such as a card's body.
 */
function inertRow(props: DrawingProps, press: RowPressProps): ReactElement {
  return (
    <View {...groupOf(press)}>
      <ItemContentSlots {...props} />
    </View>
  );
}

// What only a Pressable takes: its state-driven style and children, its hover, ripple and disabled state.
const pressOnly = new Set([
  'style',
  'children',
  'onHoverIn',
  'onHoverOut',
  'android_ripple',
  'disabled',
]);

// The row's name, role and class, without what only a Pressable takes.
const groupOf = (press: RowPressProps): ViewProps =>
  Object.fromEntries(
    Object.entries(press).filter(([key]) => !pressOnly.has(key)),
  );

// A plain function, not a component, so the row is no deeper than its press.
function besidePress(
  { props, press }: BesidePressProps,
  accessories: boolean,
): ReactElement {
  return (
    <View className="relative">
      <Pressable {...press} className={pressClassName(press, accessories)}>
        {pressContent(props, accessories)}
      </Pressable>
      {outsideLanes(props, press, accessories)}
    </View>
  );
}

const pressClassName = (press: RowPressProps, accessories: boolean): string =>
  cn(press.className, accessories && 'absolute inset-0');

const pressContent = (
  props: DrawingProps,
  accessories: boolean,
): ReactElement | null =>
  accessories ? null : <ItemContentSlots {...props} />;

const outsideLanes = (
  props: DrawingProps,
  press: RowPressProps,
  accessories: boolean,
): ReactElement | null =>
  accessories ? <PassThroughLanes props={props} press={press} /> : null;

function PassThroughLanes({ props, press }: BesidePressProps): ReactElement {
  return (
    <View pointerEvents="box-none" className={usePressLanes(props)}>
      <RowPressContext value={press}>
        <PassThroughContext value>
          <ItemContentSlots {...props} />
        </PassThroughContext>
      </RowPressContext>
    </View>
  );
}
