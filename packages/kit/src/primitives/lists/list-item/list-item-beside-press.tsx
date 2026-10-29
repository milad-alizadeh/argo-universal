import type { ReactElement } from 'react';
import { Pressable, View } from 'react-native';
import { cn } from '../../../utils';
import {
  hasAccessories,
  PassThroughContext,
  RowPressContext,
} from './list-item-pass-through';
import { usePressLanes } from './list-item-press-class';
import type { DrawingProps, RowPressProps } from './list-item-press-props';
import { ItemContentSlots } from './list-item-slots';

/*
 * A row with accessories draws its press as an empty layer under its content, so the web never nests the accessories'
 * buttons in the row's and a screen reader reaches each accessory after the row. The content lets every press but an
 * accessory's fall through to the row's press.
 */
interface BesidePressProps {
  props: DrawingProps;
  press: RowPressProps;
}

// Keep the row's press target mounted when asynchronous accessories appear.
export function besidePressFor(props: DrawingProps, tile: boolean): boolean {
  if (hasAccessories(props)) return true;

  if (tile) return false;

  return [props.onPress, props.href].some(Boolean);
}

export function BesidePress({ props, press }: BesidePressProps): ReactElement {
  const accessories = hasAccessories(props);

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
