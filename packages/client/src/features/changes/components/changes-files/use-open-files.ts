import { useCallback, useMemo, useState } from 'react';

export interface OpenFiles {
  // The files folded away; every other file, including one a later page brings, shows its diff.
  folded: ReadonlySet<string>;
  setOpen: (path: string, open: boolean) => void;
}

// Folds kept elsewhere, as with the Session; without them the list keeps its own.
export interface HeldFolds {
  folded?: readonly string[];
  onOpenChange?: (path: string, open: boolean) => void;
}

const none: ReadonlySet<string> = new Set();

function toggled(
  folded: ReadonlySet<string>,
  path: string,
  open: boolean,
): ReadonlySet<string> {
  const next = new Set(folded);

  if (open) next.delete(path);
  else next.add(path);

  return next;
}

// Which files are folded. Files start open, so the list is read without a press per file.
export function useOpenFiles({ folded, onOpenChange }: HeldFolds): OpenFiles {
  const [own, update] = useState(none);
  const held = useMemo(() => folded && new Set(folded), [folded]);

  const setOpen = useCallback<OpenFiles['setOpen']>(
    (path, opened) => {
      if (onOpenChange) onOpenChange(path, opened);
      else update((last) => toggled(last, path, opened));
    },
    [onOpenChange],
  );

  return { folded: held ?? own, setOpen };
}
