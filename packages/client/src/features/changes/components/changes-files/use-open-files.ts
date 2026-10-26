import type { ChangesComparison } from '../../view/changes-comparison';
import { useComparisonState } from '../../view/use-comparison-state';

export interface OpenFiles {
  open: ReadonlySet<string>;
  setOpen: (path: string, open: boolean) => void;
}

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
  const [open, update] = useComparisonState(comparison, none);

  return {
    open,
    setOpen: (path, opened) => update((last) => toggled(last, path, opened)),
  };
}
