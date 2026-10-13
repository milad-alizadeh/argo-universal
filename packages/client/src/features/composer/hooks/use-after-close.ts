import { useCallback, useRef } from 'react';

type After = { save: (after?: () => void) => void; take: () => void };

interface AfterClose {
  close: (after?: () => void) => void;
  closed: () => void;
  onOpenChange: (open: boolean) => void;
}

export function useAfterClose(setOpen: (open: boolean) => void): AfterClose {
  const afterClose = useStoredAfter();
  const close = useClose(afterClose, setOpen);
  const onOpenChange = useOpenChange(afterClose, setOpen);

  return { close, closed: afterClose.take, onOpenChange };
}

function useStoredAfter(): After {
  const after = useRef<(() => void) | null>(null);

  const save = useCallback((next?: () => void): void => {
    after.current = next ?? null;
  }, []);

  const take = useCallback((): void => {
    const next = after.current;
    after.current = null;
    next?.();
  }, []);

  return { save, take };
}

function useClose(
  afterClose: After,
  setOpen: (open: boolean) => void,
): AfterClose['close'] {
  const save = afterClose.save;

  return useCallback(
    (after?: () => void): void => {
      save(after);
      setOpen(false);
    },
    [save, setOpen],
  );
}

function useOpenChange(
  afterClose: After,
  setOpen: (open: boolean) => void,
): AfterClose['onOpenChange'] {
  const save = afterClose.save;

  return useCallback(
    (open: boolean): void => {
      if (open) save();
      setOpen(open);
    },
    [save, setOpen],
  );
}
