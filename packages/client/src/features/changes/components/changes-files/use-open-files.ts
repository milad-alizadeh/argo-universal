import { useState } from 'react';

export interface OpenFiles {
  // The files folded away; every other file, including one a later page brings, shows its diff.
  folded: ReadonlySet<string>;
  setOpen: (path: string, open: boolean) => void;
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
export function useOpenFiles(): OpenFiles {
  const [folded, update] = useState(none);

  return {
    folded,
    setOpen: (path, opened) => update((last) => toggled(last, path, opened)),
  };
}
