import { use } from 'react';
import {
  InRowFrameContext,
  rowFrameReachClassName,
} from '#primitives/fields/field-row';
import { cn } from '../../../utils';
import type { ListItemProps } from './list-item-props';
import { itemSurface, type ItemDrawing } from './list-item-styles';

const tileSurface = 'relative overflow-hidden rounded-3xl bg-card';

type SurfaceProps = Pick<ListItemProps, 'selected' | 'tone' | 'sidebar'>;

/*
 * The row's surface: a tile's card, or its List's row. In a web grouped cell's row frame it reaches back over the
 * frame's padding, so its hover and selected tints fill the cell out to the card's edges.
 */
export function useItemSurface(
  drawing: ItemDrawing,
  props: SurfaceProps,
  tile: boolean,
): string {
  const framed = use(InRowFrameContext);

  return cn(
    tile ? tileSurface : itemSurface(drawing, props),
    framed && rowFrameReachClassName,
  );
}
