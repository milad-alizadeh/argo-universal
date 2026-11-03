import {
  type RefObject,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { LayoutChangeEvent, ViewInstance } from 'react-native';

export type MeasuredContent = RefObject<ViewInstance | null>;

export interface Measurement {
  // The content's height as last measured, which a motion reads on every frame.
  height: RefObject<number>;
  rendered: number;
  measured: boolean;
  forget: () => void;
  onLayout: (event: LayoutChangeEvent) => void;
}

function measureHeight(
  content: MeasuredContent,
  record: (height: number) => void,
): void {
  content.current?.measure((...box) => {
    if (box[3]) record(box[3]);
  });
}

// Content kept mounted while closed lays out no differently when it reopens, so it is asked for its height.
function useMeasureOnOpen(
  content: MeasuredContent,
  open: boolean,
  { measured, record }: { measured: boolean; record: (h: number) => void },
): void {
  useLayoutEffect(() => {
    if (open && !measured) measureHeight(content, record);
  }, [content, open, measured, record]);
}

// Closed content unmounts with the rows inside it, so it measures again before it next opens.
export function useForgetWhenHidden(hidden: boolean, forget: () => void): void {
  useLayoutEffect(() => {
    if (hidden) forget();
  }, [hidden, forget]);
}

function useRecordedHeight(): Omit<Measurement, 'onLayout'> & {
  record: (height: number) => void;
} {
  const height = useRef(0);
  const [rendered, setRendered] = useState(0);
  const [measured, setMeasured] = useState(false);

  const record = useCallback((next: number): void => {
    height.current = next;
    setRendered(next);
    setMeasured(true);
  }, []);

  const forget = useCallback(() => setMeasured(false), []);

  return { height, rendered, measured, record, forget };
}

export function useMeasurement(
  content: MeasuredContent,
  open: boolean,
): Measurement {
  const { record, ...measurement } = useRecordedHeight();

  useMeasureOnOpen(content, open, { measured: measurement.measured, record });

  return {
    ...measurement,
    // Closing content keeps its height: lifted out of the flow it can lay out taller, pushing the rows below down first.
    onLayout: (event) => {
      if (open) record(event.nativeEvent.layout.height);
    },
  };
}
