import { placedContent } from './list-item-placement';
import type { DrawingProps } from './list-item-press-props';

export function drawingContent(
  props: DrawingProps,
  tile: boolean,
): DrawingProps {
  const content = tile ? props : placedContent(props);

  return {
    ...content,
    accessibilityLabel:
      props.accessibilityLabel ??
      [props.title, props.value].filter(Boolean).join(', '),
  };
}
