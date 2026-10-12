import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { View, type LayoutChangeEvent } from 'react-native';

interface ContentMeasurement {
  content: RefObject<View | null>;
  contentHeight: RefObject<number>;
  renderedHeight: number;
  measured: boolean;
  onLayout: (event: LayoutChangeEvent) => void;
}
function measureContent(
  content: RefObject<View | null>,
  recordHeight: (height: number) => void,
): void {
  content.current?.measure((...measurements) => {
    const height = measurements[3];
    if (height) recordHeight(height);
  });
}
function useMeasuredHeight(): Omit<
  ContentMeasurement,
  'content' | 'onLayout'
> & { recordHeight: (height: number) => void } {
  const contentHeight = useRef(0);
  const [measured, setMeasured] = useState(false);
  const [renderedHeight, setRenderedHeight] = useState(0);
  const recordHeight = useCallback((height: number): void => {
    contentHeight.current = height;
    setRenderedHeight(height);
    setMeasured(true);
  }, []);
  return { contentHeight, measured, renderedHeight, recordHeight };
}
export function useContentMeasurement(open: boolean): ContentMeasurement {
  const content = useRef<View>(null);
  const { recordHeight, ...measurement } = useMeasuredHeight();
  useLayoutEffect(() => {
    if (open && !measurement.measured) measureContent(content, recordHeight);
  }, [open, measurement.measured, recordHeight]);
  return {
    ...measurement,
    content,
    onLayout: (event) => recordHeight(event.nativeEvent.layout.height),
  };
}
