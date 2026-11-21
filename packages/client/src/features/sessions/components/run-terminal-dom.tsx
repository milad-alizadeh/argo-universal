'use dom';

import type { RunOutput, RunOutputCursor } from '@repo/contracts';
import type { DOMProps } from 'expo/dom';
import { useCallback, useEffect, useState, type ReactElement } from 'react';
import type { RunOutputSource } from './run-terminal-props';
import { RunTerminalSurface } from './run-terminal-surface';

type Read = (cursor: RunOutputCursor | null) => Promise<RunOutput | null>;

type Props = Omit<
  React.ComponentProps<typeof RunTerminalSurface>,
  'listen' | 'onInput' | 'onResize'
> & {
  onRead: Read;
  onInput: (text: string) => Promise<void>;
  onResize: (columns: number, rows: number) => Promise<void>;
  dom?: DOMProps;
};

const retryMs = 100;

function readFrames(
  read: Read,
  cursor: RunOutputCursor | undefined,
  receive: Parameters<RunOutputSource>[1],
): () => void {
  let active = true;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let next = cursor ?? null;

  async function pump(): Promise<void> {
    const frame = await read(next).catch(() => null);

    if (!active) return;

    if (!frame) {
      retry = setTimeout(() => void pump(), retryMs);

      return;
    }

    next = frame.cursor;
    receive(frame);
    void pump();
  }

  void pump();

  return (): void => {
    active = false;
    clearTimeout(retry);
  };
}

export default function RunTerminalDOM({
  onRead,
  ...props
}: Props): ReactElement {
  const listen = useCallback<RunOutputSource>(
    (cursor, receive) => readFrames(onRead, cursor, receive),
    [onRead],
  );

  const height = useViewportHeight();

  return (
    <div style={{ display: 'flex', height }}>
      <RunTerminalSurface {...props} listen={listen} />
    </div>
  );
}

function useViewportHeight(): string | number {
  const [height, setHeight] = useState(() => window.visualViewport?.height);

  useEffect(() => {
    const viewport = window.visualViewport;

    if (!viewport) return;

    const resize = (): void => setHeight(viewport.height);

    viewport.addEventListener('resize', resize);

    return (): void => viewport.removeEventListener('resize', resize);
  }, []);

  return height ?? '100dvh';
}
