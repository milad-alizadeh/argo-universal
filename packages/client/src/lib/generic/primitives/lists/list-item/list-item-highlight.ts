import { useContext, useEffect, type ComponentProps } from 'react';
import type { Pressable } from 'react-native';
import { ListContext } from '../../../list-context';
import type { HighlightReason } from '../../../row-highlights';
import type { DrawingProps } from './list-item-press-props';

type HighlightHandlers = Pick<
  ComponentProps<typeof Pressable>,
  'onHoverIn' | 'onHoverOut' | 'onPressIn' | 'onPressOut'
>;

export type MarkHighlight = (reason: HighlightReason, on: boolean) => void;

export function useMarkHighlight(): MarkHighlight {
  const { highlights, index } = useContext(ListContext);

  return (reason, on) => {
    if (highlights && index !== undefined) highlights.mark(index, reason, on);
  };
}

// A selected row stays highlighted; a row that leaves the List, or a recycled cell, takes its marks with it.
export function useSelectedHighlight(selected: boolean | undefined): void {
  const { highlights, index } = useContext(ListContext);

  useEffect(() => {
    if (!highlights || index === undefined) return;

    highlights.mark(index, 'selected', !!selected);
  }, [highlights, index, selected]);

  useEffect(() => {
    if (!highlights || index === undefined) return;

    return (): void => highlights.clear(index);
  }, [highlights, index]);
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
