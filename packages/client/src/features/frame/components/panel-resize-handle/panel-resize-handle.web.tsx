import type * as React from 'react';
import type { AriaAttributes, KeyboardEvent } from 'react';
import { edgeClassName, keyboardStep } from './panel-resize-edge';
import type { PanelResizeHandleProps } from './panel-resize-handle';
import { usePointerResize } from './use-pointer-resize.web';

function keyedWidth(
  { value, minimum, maximum, direction }: PanelResizeHandleProps,
  key: string,
): number | undefined {
  return new Map([
    ['ArrowLeft', value - keyboardStep * direction],
    ['ArrowRight', value + keyboardStep * direction],
    ['Home', minimum],
    ['End', maximum],
  ]).get(key);
}

function resizeByKey(
  props: PanelResizeHandleProps,
  event: KeyboardEvent<HTMLDivElement>,
): void {
  const width = keyedWidth(props, event.key);

  if (width === undefined) return;
  event.preventDefault();
  props.onChange(width);
}

function separatorAria({
  label,
  minimum,
  maximum,
  value,
}: PanelResizeHandleProps): AriaAttributes {
  return {
    'aria-label': label,
    'aria-orientation': 'vertical',
    'aria-valuemin': minimum,
    'aria-valuemax': maximum,
    'aria-valuenow': Math.round(value),
  };
}

export function PanelResizeHandle(
  props: PanelResizeHandleProps,
): React.JSX.Element {
  const pointerResize = usePointerResize(props);

  return (
    <div
      role="separator"
      tabIndex={0}
      className={`${edgeClassName(props.edge)} cursor-col-resize touch-none select-none focus-visible:outline-2 focus-visible:outline-focus focus-visible:-outline-offset-2`}
      {...separatorAria(props)}
      {...pointerResize}
      onKeyDown={(event) => resizeByKey(props, event)}
    />
  );
}
