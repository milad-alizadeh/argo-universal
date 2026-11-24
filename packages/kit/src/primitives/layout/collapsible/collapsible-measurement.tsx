import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { type LayoutChangeEvent, type ViewInstance } from 'react-native';

interface ContentMeasurement {
  content: RefObject<ViewInstance | null>;
  contentHeight: RefObject<number>;
  renderedHeight: number;
  measured: boolean;
  onLayout: (event: LayoutChangeEvent) => void;
  forget: () => void;
}

function measureContent(
  content: RefObject<ViewInstance | null>,
  recordHeight: (height: number) => void,
): void {
  content.current?.measure((...measurements) => {
    const height = measurements[3];

    if (height) recordHeight(height);
  });
}

function useMeasuredHeight(
  open: boolean,
  resting: RefObject<boolean>,
): Omit<ContentMeasurement, 'content' | 'onLayout'> & {
  recordHeight: (height: number) => void;
} {
  const contentHeight = useRef(0);
  const [measured, setMeasured] = useState(false);
  const [renderedHeight, setRenderedHeight] = useState(0);

  const recordHeight = useCallback((height: number): void => {
    contentHeight.current = height;

    if (resting.current) return;

    setRenderedHeight(height);
    setMeasured(true);
  }, [resting]);

  const forget = useCallback((): void => setMeasured(false), []);

  // The drawing reads the height once the content leaves rest, which is when it closes.
  useLayoutEffect(() => {
    if (!open && contentHeight.current !== renderedHeight)
      setRenderedHeight(contentHeight.current);
  }, [open, renderedHeight]);

  return {
    contentHeight,
    measured,
    renderedHeight,
    recordHeight,
    forget,
  };
}

/*
 * `resting` is whether the content is open and still. Then a new height is only kept, for a drawing that does not use it
 * yet, so content that mounts open costs no second draw.
 */
export function useContentMeasurement(
  open: boolean,
  resting: RefObject<boolean>,
): ContentMeasurement {
  const content = useRef<ViewInstance>(null);
  const { recordHeight, ...measurement } = useMeasuredHeight(open, resting);
  useLayoutEffect(() => {
    if (open && !measurement.measured) measureContent(content, recordHeight);
  }, [open, measurement.measured, recordHeight]);

  return {
    ...measurement,
    content,
    // Closing content keeps the height it had: lifted out of the flow to move, it can lay out a few points taller, which would push the rows below down before they rise.
    onLayout: (event) => {
      if (open) recordHeight(event.nativeEvent.layout.height);
    },
  };
}
