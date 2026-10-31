import type { ValuePlacement } from '../../../list-look';
import { placedContent } from './list-item-placement';
import type { DrawingProps } from './list-item-press-props';

export function drawingContent(
  props: DrawingProps,
  tile: boolean,
  placement: ValuePlacement,
): DrawingProps {
  const content = tile ? props : placedContent(props, placement);

  // The same title and value as `rowLabel`; see `metaAccessories` for what the name leaves out.
  return {
    ...content,
    accessibilityLabel:
      props.accessibilityLabel ??
      [props.title, props.value].filter(Boolean).join(', '),
  };
}
