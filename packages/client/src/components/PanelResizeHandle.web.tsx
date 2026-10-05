import { useRef } from 'react';
import type { PanelResizeHandleProps } from './PanelResizeHandle';

export function PanelResizeHandle({
  label,
  value,
  minimum,
  maximum,
  direction,
  edge = 'right',
  onChange,
  onDragStateChange,
}: PanelResizeHandleProps) {
  const drag = useRef<{
    pointer: number;
    position: number;
    width: number;
  } | null>(null);
  const resize = (width: number) => onChange(width);
  return (
    <hr
      aria-label={label}
      aria-orientation="vertical"
      aria-valuemin={minimum}
      aria-valuemax={maximum}
      aria-valuenow={Math.round(value)}
      tabIndex={0}
      className={`m-0 h-auto border-0 absolute ${edge === 'left' ? '-left-1' : '-right-1'} bottom-0 top-shell-bar z-10 w-2 cursor-col-resize touch-none select-none outline-none focus-visible:bg-ring/30 hover:bg-border/40`}
      onPointerDown={(event) => {
        onDragStateChange?.(true);
        drag.current = {
          pointer: event.pointerId,
          position: event.clientX,
          width: value,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        event.preventDefault();
      }}
      onPointerMove={(event) => {
        if (drag.current?.pointer === event.pointerId)
          resize(
            drag.current.width +
              (event.clientX - drag.current.position) * direction,
          );
      }}
      onPointerUp={(event) => {
        drag.current = null;
        onDragStateChange?.(false);
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onLostPointerCapture={() => {
        drag.current = null;
        onDragStateChange?.(false);
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          resize(value + (event.key === 'ArrowRight' ? 16 : -16) * direction);
        } else if (event.key === 'Home' || event.key === 'End') {
          event.preventDefault();
          resize(event.key === 'Home' ? minimum : maximum);
        }
      }}
    />
  );
}
