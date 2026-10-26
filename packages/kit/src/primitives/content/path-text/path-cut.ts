import { useEffectEvent, useLayoutEffect, useRef, useState } from 'react';
import { Platform, type ViewInstance } from 'react-native';

// On web a View is its DOM element.
const domNode = (view: ViewInstance | null): Element | undefined => {
  const node: unknown = view;

  return Platform.OS === 'web' && node instanceof Element ? node : undefined;
};

// A line cut short holds more than its box shows; each part of the path is one box around one line.
const cutShort = (row: Element): boolean =>
  [...row.children].some(
    ({ firstElementChild: line }) =>
      line !== null && line.scrollWidth > line.clientWidth,
  );

interface CutWatch {
  ref: React.RefObject<ViewInstance | null>;
  onLayout: () => void;
  cut: boolean;
}

// Whether, on web, the path's row cuts it short; re-measured when the row changes width or draws another path. A phone never reports a cut.
export function useCutShort(path: string): CutWatch {
  const ref = useRef<ViewInstance>(null);
  const [cut, setCut] = useState(false);

  const onLayout = (): void => {
    const node = domNode(ref.current);

    setCut(node ? cutShort(node) : false);
  };

  const measure = useEffectEvent(onLayout);

  // A recycled row keeps its width, so a new path is measured on its own.
  useLayoutEffect(() => measure(), [path]);

  return { ref, onLayout, cut };
}
