import {
  createContext,
  type ReactElement,
  type ReactNode,
  use,
  useEffect,
  useState,
} from 'react';
import type { SessionsListPlugins } from './sessions-list-props';

type OnRowsDrawn = NonNullable<SessionsListPlugins['onRowsDrawn']>;

// The Sessions whose rows the list draws now: the rows on screen and the few it draws past each edge.
interface DrawnRowsRegistry {
  add: (sessionId: string) => void;
  remove: (sessionId: string) => void;
  listen: (onRowsDrawn: OnRowsDrawn | undefined) => void;
}

const DrawnRowsContext = createContext<DrawnRowsRegistry | null>(null);

// Each Session's rows, counted, since a recycled row can take a Session before the row that had it lets go.
function counted(
  counts: Map<string, number>,
  sessionId: string,
  by: number,
): void {
  const count = (counts.get(sessionId) ?? 0) + by;

  if (count > 0) counts.set(sessionId, count);
  else counts.delete(sessionId);
}

interface Drawn {
  counts: Map<string, number>;
  report?: OnRowsDrawn;
}

const told = (drawn: Drawn): void => drawn.report?.([...drawn.counts.keys()]);

const change =
  (drawn: Drawn, by: number) =>
  (sessionId: string): void => {
    counted(drawn.counts, sessionId, by);
    told(drawn);
  };

function drawnRows(): DrawnRowsRegistry {
  const drawn: Drawn = { counts: new Map() };

  return {
    add: change(drawn, 1),
    remove: change(drawn, -1),
    // A listener hears the rows already drawn, since rows draw before the list listens.
    listen: (onRowsDrawn) => {
      drawn.report = onRowsDrawn;
      told(drawn);
    },
  };
}

// Reports every change to the drawn rows; the listener settles them, so a scroll asks once it stops.
export function DrawnRows(props: {
  onRowsDrawn: OnRowsDrawn | undefined;
  children: ReactNode;
}): ReactElement {
  const [rows] = useState(drawnRows);
  const { onRowsDrawn } = props;

  useEffect(() => {
    rows.listen(onRowsDrawn);
  }, [rows, onRowsDrawn]);

  return <DrawnRowsContext value={rows}>{props.children}</DrawnRowsContext>;
}

// A row counts as drawn while it shows its Session.
export function useDrawnRow(sessionId: string): void {
  const rows = use(DrawnRowsContext);

  useEffect(() => {
    rows?.add(sessionId);

    return (): void => rows?.remove(sessionId);
  }, [rows, sessionId]);
}
