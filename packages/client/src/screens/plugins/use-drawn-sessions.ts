import { useCallback, useEffect, useState } from 'react';

// The drawn rows settle for this long before the list asks the Plugins about them, so a scroll asks once it stops.
const drawnSettleMilliseconds = 200;

// Runs only the last task handed to it within the settle time.
class Settle {
  private timer?: ReturnType<typeof setTimeout>;

  run(task: () => void): void {
    this.cancel();
    this.timer = setTimeout(task, drawnSettleMilliseconds);
  }

  cancel(): void {
    clearTimeout(this.timer);
  }
}

const noSessions: ReadonlySet<string> = new Set();

interface DrawnSessions {
  drawn: ReadonlySet<string>;
  onRowsDrawn: (sessionIds: readonly string[]) => void;
}

// The Sessions whose rows the list draws, once they stop changing.
export function useDrawnSessions(): DrawnSessions {
  const [drawn, setDrawn] = useState(noSessions);
  const [settle] = useState(() => new Settle());

  useEffect(() => (): void => settle.cancel(), [settle]);

  const onRowsDrawn = useCallback(
    (sessionIds: readonly string[]) =>
      settle.run(() => setDrawn(new Set(sessionIds))),
    [settle],
  );

  return { drawn, onRowsDrawn };
}
