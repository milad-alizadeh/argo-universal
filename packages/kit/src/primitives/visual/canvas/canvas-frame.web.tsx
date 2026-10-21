import { createElement, useState, type HTMLAttributes } from 'react';
import { frameEvents } from './canvas-frame-events.web';
import { useCanvasHost } from './canvas-frame-hooks.web';
import { CanvasGesture } from './canvas-gesture';
import type { CanvasFrameProps } from './canvas-props';

function frameAttributes(
  props: CanvasFrameProps,
): HTMLAttributes<HTMLDivElement> {
  return {
    role: 'application',
    'aria-label': `${props.label} canvas`,
    tabIndex: 0,
    style: frameStyle(props),
  };
}

export function CanvasFrame(props: CanvasFrameProps): React.JSX.Element {
  const ref = useCanvasHost(props);
  const [gesture] = useState(() => new CanvasGesture());
  const events = frameEvents(props, gesture);

  return createElement(
    'div',
    { ref, ...events, ...frameAttributes(props) },
    frameImage(props),
  );
}

function frameStyle(
  props: CanvasFrameProps,
): HTMLAttributes<HTMLDivElement>['style'] {
  return {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    touchAction: props.camera === 'pan-zoom' ? 'none' : 'auto',
  } as const;
}

function frameImage(props: CanvasFrameProps): React.JSX.Element {
  return createElement(
    'div',
    {
      role: 'img',
      'aria-label': props.label,
      style: { width: '100%', height: '100%' },
    },
    props.children,
  );
}
