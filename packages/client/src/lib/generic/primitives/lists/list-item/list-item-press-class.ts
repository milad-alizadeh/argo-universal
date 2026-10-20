import { use } from 'react';
import { ListContext } from '../../../list-context';
import { useInMenu } from '../../../menu-rows-context';
import { useRowDrawing } from '../../../row-drawing-context';
import { cn } from '../../../utils';
import type { DrawingProps } from './list-item-press-props';
import { itemPress } from './list-item-press-styles';

// A menu trigger's row (a web Picker row) presses through its pointer handler and popup.
function interactive(props: DrawingProps): boolean {
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
  'interactive' | 'control' | 'sidebar' | 'avatar'
> => ({
  interactive: interactive(props),
  control: props.control !== undefined,
  sidebar: props.sidebar,
  avatar: props.avatar !== undefined,
});

// The row's press lanes and tints, by where it sits: a menu, a sidebar, or its List's appearance.
export function usePressClass(props: DrawingProps): string {
  const place = {
    menu: useInMenu(),
    rows: useRowDrawing(),
    appearance: use(ListContext).appearance,
  };

  return cn(
    itemPress({ ...place, ...rowPress(props) }),
    props.disabled && 'opacity-50',
  );
}
