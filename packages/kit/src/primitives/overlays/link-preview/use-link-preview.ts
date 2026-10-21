import { useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  LinkPreviewContext,
  type LinkPreviewSource,
} from './link-preview-context';

const tooltipDelayMs = 500;

const closeGraceMs = 150;

export type PreviewState = {
  data: ReactNode;
  open: boolean;
  setOpen: (open: boolean) => void;
  enter: () => void;
  leave: () => void;
  clear: () => void;
  close: () => void;
};

type PreviewLoad = { load: () => void; data: ReactNode };

export function useLinkPreview(href: string): PreviewState {
  const source = useContext(LinkPreviewContext);
  const { load, data } = usePreviewLoad(source, href);
  const [open, setOpen] = useState(false);
  const timer = usePreviewTimer(setOpen);

  return {
    data,
    open,
    setOpen,
    ...timer,
    enter: enterAndLoad(timer.enter, load),
  };
}

function usePreviewLoad(
  source: LinkPreviewSource | null,
  href: string,
): PreviewLoad {
  const [data, setData] = useState<ReactNode>(null);
  const alive = useAlive();
  const pending = useRef(false);

  return {
    data,
    load: (): void => requestPreview({ source, href, alive, pending, setData }),
  };
}

type LoadRequest = {
  source: LinkPreviewSource | null;
  href: string;
  alive: { current: boolean };
  pending: { current: boolean };
  setData: (value: ReactNode) => void;
};

function requestPreview(request: LoadRequest): void {
  if (!canLoad(request)) return;
  const { source, href, alive, pending, setData } = request;

  if (!source) return;
  pending.current = true;
  void source
    .load(href)
    .then((value) => {
      if (alive.current) setData(value);
    })
    .catch(() => {})
    .finally(() => {
      pending.current = false;
    });
}

function canLoad({ source, href, pending }: LoadRequest): boolean {
  return Boolean(source) && /^https?:\/\//i.test(href) && !pending.current;
}

type PreviewTimer = Pick<PreviewState, 'enter' | 'leave' | 'clear' | 'close'>;

function usePreviewTimer(setOpen: PreviewState['setOpen']): PreviewTimer {
  const [timer] = useState(() => new HoverTimer(setOpen));
  useEffect(() => timer.clear, [timer]);

  return timer;
}

class HoverTimer implements PreviewTimer {
  private pending: ReturnType<typeof setTimeout> | null = null;
  public constructor(private readonly setOpen: PreviewState['setOpen']) {}
  public clear = (): void => {
    if (this.pending) clearTimeout(this.pending);
  };
  public enter = (): void => this.schedule(true, tooltipDelayMs);
  public leave = (): void => this.schedule(false, closeGraceMs);
  public close = (): void => {
    this.clear();
    this.setOpen(false);
  };
  private schedule(open: boolean, delay: number): void {
    this.clear();
    this.pending = setTimeout(() => this.setOpen(open), delay);
  }
}

function useAlive(): { current: boolean } {
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;

    return (): void => {
      alive.current = false;
    };
  }, []);

  return alive;
}

function enterAndLoad(enter: () => void, load: () => void): () => void {
  return (): void => {
    enter();
    load();
  };
}
