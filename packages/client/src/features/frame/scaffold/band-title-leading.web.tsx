import { useRef, type ReactElement, type RefObject } from 'react';
import { useFrameTransition } from '../hooks/use-frame-transition.web';
import type { BandTitleLeadingProps } from './band-title-leading';

function useLeadingMotion(
  props: BandTitleLeadingProps,
): RefObject<HTMLDivElement | null> {
  const element = useRef<HTMLDivElement>(null);
  useFrameTransition({
    ...props,
    value: props.width,
    frames: (from, to) => [
      [element.current, [{ width: `${from}px` }, { width: `${to}px` }]],
    ],
  });

  return element;
}

// Inline width is always the destination; motion interpolates from its previous width.
export function BandTitleLeading(props: BandTitleLeadingProps): ReactElement {
  const element = useLeadingMotion(props);

  return (
    <div
      ref={element}
      data-testid="band-title-leading"
      className="shrink-0"
      style={{ width: props.width }}
    />
  );
}
