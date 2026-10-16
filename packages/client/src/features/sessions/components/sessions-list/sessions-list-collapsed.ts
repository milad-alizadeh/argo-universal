import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
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

// Runs a callback later; timers still pending when the list goes are cleared.
function useLater(): (callback: () => void, milliseconds: number) => void {
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const pending = timers.current;

    return (): void => {
      for (const timer of pending) clearTimeout(timer);
    };
  }, []);

  return useCallback((callback, milliseconds) => {
    timers.current.add(setTimeout(callback, milliseconds));
  }, []);
}

interface IdSetters {
  setCollapsed: SetIds;
  setClosing: SetIds;
}

// A Project whose fade is done leaves closing and becomes collapsed.
const finishClosing = (
  { setCollapsed, setClosing }: IdSetters,
  id: string,
): void => {
  setCollapsed((current) => withId(current, id));
  setClosing((current) => withoutId(current, id));
};

// Starts a Project's fade.
function useClosing(setters: IdSetters): (id: string) => void {
  const later = useLater();
  const { setClosing } = setters;

  return useCallback(
    (id: string) => {
      setClosing((current) => withId(current, id));
      later(() => finishClosing(setters, id), closeMilliseconds);
    },
    [later, setClosing, setters],
  );
}

// Which Project headings are collapsed, and the toggle for one: a collapse lets the rows fade out first.
export function useCollapsedProjects(): CollapsedProjects {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [closing, setClosing] = useState<ReadonlySet<string>>(new Set());

  const setters = useMemo(() => ({ setCollapsed, setClosing }), []);
  const close = useClosing(setters);

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
