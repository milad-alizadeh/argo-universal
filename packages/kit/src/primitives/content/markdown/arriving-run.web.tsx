import type * as React from 'react';
import { Text as Span } from 'react-native';
import type { ArrivingRunProps } from './arriving-run-props';

// One fade as the run mounts, played by the browser: it costs no render, and text that stays on screen never plays it again.
export function ArrivingRun({ children }: ArrivingRunProps): React.JSX.Element {
  return (
    <Span
      testID="arriving-text"
      className="animate-in fade-in-0 duration-300 ease-streaming-text motion-reduce:animate-none"
    >
      {children}
    </Span>
  );
}
