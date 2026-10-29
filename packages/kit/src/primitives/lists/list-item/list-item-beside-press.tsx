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
import { useFoldButton } from './list-item-tree';

// Accessories and a parent's chevron are buttons of their own, which the web must not nest in the row's.
export function useBesidePress(props: DrawingProps): boolean {
  const folds = useFoldButton();

  return hasAccessories(props) || folds;
}

/*
 * A row with accessories, or a parent's chevron, draws its press as an empty layer under its content, so the web never
 * nests their buttons in the row's and a screen reader reaches each accessory after the row. The content lets every
 * press but an accessory's or the chevron's fall through to the row's press.
 */
interface BesidePressProps {
  props: DrawingProps;
  press: RowPressProps;
}

export function BesidePress({ props, press }: BesidePressProps): ReactElement {
  return (
    <View className="relative">
      <Pressable
        {...press}
        className={cn(press.className, 'absolute inset-0')}
      />
      <PassThroughLanes props={props} press={press} />
    </View>
  );
}

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
