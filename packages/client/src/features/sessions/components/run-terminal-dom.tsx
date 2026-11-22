'use dom';

import type { RunOutput, RunOutputCursor } from '@repo/contracts';
import type { DOMProps } from 'expo/dom';
import { useCallback, useEffect, useState, type ReactElement } from 'react';
import type { RunOutputSource } from './run-terminal-props';
import { readTerminalFrames } from './run-terminal-replay';
import { RunTerminalSurface } from './run-terminal-surface';

type Read = (cursor: RunOutputCursor | null) => Promise<RunOutput | null>;

type Props = Omit<
  React.ComponentProps<typeof RunTerminalSurface>,
  'listen' | 'onInput' | 'onResize'
> & {
  onRead: Read;
  onInput: (text: string) => Promise<void>;
  onResize: (columns: number, rows: number) => Promise<void>;
  containerHeight: number;
  dom?: DOMProps;
};

export default function RunTerminalDOM({
  onRead,
  containerHeight,
  ...props
}: Props): ReactElement {
  const listen = useCallback<RunOutputSource>(
    (cursor, receive) => readTerminalFrames(onRead, cursor, receive),
    [onRead],
  );

  const viewportHeight = useViewportHeight();
  const height = terminalHeight(containerHeight, viewportHeight);

  return (
    <div
      style={{
        display: 'flex',
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        width: '100%',
        height,
      }}
    >
      <RunTerminalSurface {...props} listen={listen} />
    </div>
  );
}

function terminalHeight(container: number, viewport?: number): string | number {
  if (!Number.isFinite(container)) return '100dvh';

  return viewport && Number.isFinite(viewport)
    ? Math.min(container, viewport)
    : container;
}

function useViewportHeight(): number | undefined {
  const [height, setHeight] = useState(() => window.visualViewport?.height);

  useEffect(() => {
    const viewport = window.visualViewport;

    if (!viewport) return;

    const resize = (): void => setHeight(viewport.height);

    viewport.addEventListener('resize', resize);

    return (): void => viewport.removeEventListener('resize', resize);
  }, []);

  return height;
}
