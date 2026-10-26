import { useState } from 'react';
import type { ChangesComparison } from '../../view/changes-comparison';

export interface OpenFiles {
  open: ReadonlySet<string>;
  setOpen: (path: string, open: boolean) => void;
}

const comparisonKey = (comparison: ChangesComparison): string =>
  JSON.stringify(comparison);

const none: ReadonlySet<string> = new Set();

function toggled(
  paths: ReadonlySet<string>,
  path: string,
  open: boolean,
): ReadonlySet<string> {
  const next = new Set(paths);

  if (open) next.add(path);
  else next.delete(path);

  return next;
}

// Which files show their diff. Files start folded, so a long list opens fast; a new comparison folds them all again.
export function useOpenFiles(comparison: ChangesComparison): OpenFiles {
  const key = comparisonKey(comparison);
  const [state, setState] = useState({ key, open: none });
  const open = state.key === key ? state.open : none;

  return {
    open,
    setOpen: (path, opened) =>
      setState({ key, open: toggled(open, path, opened) }),
  };
}
