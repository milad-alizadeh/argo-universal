import type { ValuePlacement } from '../../../list-look';
import { placedContent } from './list-item-placement';
import type { DrawingProps } from './list-item-press-props';

export function drawingContent(
  props: DrawingProps,
  tile: boolean,
  placement: ValuePlacement,
): DrawingProps {
  const content = tile ? props : placedContent(props, placement);

  return {
    ...content,
    accessibilityLabel:
      props.accessibilityLabel ??
      [props.title, props.value].filter(Boolean).join(', '),
  };
}
