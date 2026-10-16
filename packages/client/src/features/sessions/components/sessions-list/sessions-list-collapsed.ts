import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useState,
} from 'react';

export interface CollapsedProjects {
  collapsed: ReadonlySet<string>;
  // Projects fading their rows out before they collapse.
  closing: ReadonlySet<string>;
  toggleProject: (id: string) => void;
}

// How long a Project's rows fade before they leave.
const closeMilliseconds = 150;

const withId = (ids: ReadonlySet<string>, id: string): Set<string> =>
  new Set(ids).add(id);

function withoutId(ids: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(ids);
  next.delete(id);

  return next;
}

type SetIds = Dispatch<SetStateAction<ReadonlySet<string>>>;

// Starts a Project's fade, then moves it from closing to collapsed.
function useClosing(
  setCollapsed: SetIds,
  setClosing: SetIds,
): (id: string) => void {
  return useCallback(
    (id: string) => {
      setClosing((current) => withId(current, id));
      setTimeout(() => {
        setCollapsed((current) => withId(current, id));
        setClosing((current) => withoutId(current, id));
      }, closeMilliseconds);
    },
    [setCollapsed, setClosing],
  );
}

// Which Project headings are collapsed, and the toggle for one: a collapse lets the rows fade out first.
export function useCollapsedProjects(): CollapsedProjects {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [closing, setClosing] = useState<ReadonlySet<string>>(new Set());

  const close = useClosing(setCollapsed, setClosing);

  const toggleProject = useCallback(
    (id: string) => {
      if (closing.has(id)) return;

      if (collapsed.has(id)) setCollapsed((current) => withoutId(current, id));
      else close(id);
    },
    [collapsed, closing, close],
  );

  return { collapsed, closing, toggleProject };
}
