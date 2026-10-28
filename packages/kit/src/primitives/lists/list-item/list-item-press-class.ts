import { use } from 'react';
import { ListTileContext } from '../../../list-context';
import type { ListLook } from '../../../list-look';
import { useCompactRows, useListLook } from '../../../list-look-context';
import { cn } from '../../../utils';
import type { DrawingProps } from './list-item-press-props';
import { itemPress, pressLayout } from './list-item-press-styles';

// A menu trigger's row (a web Picker row) presses through its pointer handler and popup.
export function interactive(props: DrawingProps): boolean {
  if (props.disabled) return false;

  return [
    props.onPress,
    props.href,
    props.onLongPress,
    props.onPointerDown,
    props['aria-haspopup'],
  ].some(Boolean);
}

// What the row itself asks of its press: tints when it does something, a control's line, a sidebar row's lanes.
const rowPress = (
  props: DrawingProps,
): Pick<
  Parameters<typeof itemPress>[0],
  'interactive' | 'control' | 'sidebar'
> => ({
  interactive: interactive(props),
  control: props.control !== undefined,
  sidebar: props.sidebar,
});

function usePlace(props: DrawingProps): Parameters<typeof itemPress>[0] {
  return {
    look: useListLook(),
    compact: useCompactRows(props.sidebar),
    ...rowPress(props),
  };
}

// The row's press lanes and tints, by where it sits: a menu, a sidebar, or its List's appearance.
export function usePressClass(props: DrawingProps): string {
  const place = usePlace(props);
  const tile = use(ListTileContext);

  if (tile) return tilePress(props, place.look);

  return cn(itemPress(place), rowLanes(props));
}

// The lanes of a row whose content sits beside its press, without the press's tints.
export function usePressLanes(props: DrawingProps): string {
  return cn(pressLayout(usePlace(props)), rowLanes(props));
}

function rowLanes(props: DrawingProps): string {
  return cn(
    props.leadingSize === 'avatar' &&
      'min-h-15 items-center gap-3 py-2.5 android:min-h-18 android:gap-4 android:py-2',
    props.disabled && 'opacity-50',
  );
}

function tilePress(props: DrawingProps, look: ListLook): string {
  return cn(
    'w-full flex-col items-stretch overflow-hidden rounded-3xl web:select-none',
    interactive(props) && ['web:hover:bg-hover', look.pressedTint],
    props.disabled && 'opacity-50',
  );
}
