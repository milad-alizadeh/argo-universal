import { useCallback, useContext, useEffect, type ComponentProps } from 'react';
import type { Pressable } from 'react-native';
import { ListContext } from '../../../list-context';
import {
  SetRowHighlights,
  type HighlightReason,
} from '../../../row-highlights';
import type { DrawingProps } from './list-item-press-props';

type HighlightHandlers = Pick<
  ComponentProps<typeof Pressable>,
  'onHoverIn' | 'onHoverOut' | 'onPressIn' | 'onPressOut'
>;

export type MarkHighlight = (reason: HighlightReason, on: boolean) => void;

// Points the reason at this row, or lets go of it when it still points here.
export function useMarkHighlight(): MarkHighlight {
  const setHighlighted = useContext(SetRowHighlights);
  const { index } = useContext(ListContext);

  return useCallback(
    (reason, on) =>
      setHighlighted?.((rows) => {
        if (on === (rows[reason] === index)) return rows;

        return { ...rows, [reason]: on ? index : undefined };
      }),
    [setHighlighted, index],
  );
}

export function useSelectedHighlight(selected: boolean | undefined): void {
  const mark = useMarkHighlight();

  useEffect(() => {
    if (!selected) return;

    mark('selected', true);

    return (): void => mark('selected', false);
  }, [selected, mark]);
}

export function useHighlightHandlers(props: DrawingProps): HighlightHandlers {
  const mark = useMarkHighlight();

  return {
    onHoverIn: (event) => {
      mark('hover', true);
      props.onHoverIn?.(event);
    },
    onHoverOut: (event) => {
      mark('hover', false);
      props.onHoverOut?.(event);
    },
    onPressIn: () => mark('press', true),
    onPressOut: () => mark('press', false),
  };
}
