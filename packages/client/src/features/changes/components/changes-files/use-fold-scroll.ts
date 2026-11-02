import type { LegendListRef } from '@legendapp/list/react-native';
import { isLegendList, type ListRef } from '@repo/kit/primitives/lists/list';
import { type RefObject, useRef } from 'react';
import { headerKey } from '../../view/changes-items';
import type { OpenFiles } from './use-open-files';

export interface FoldScroll {
  ref: RefObject<ListRef | null>;
  setOpen: OpenFiles['setOpen'];
}

// Where a file's header sits, when its top has scrolled out of view above the list.
function scrolledAwayTop(
  list: LegendListRef,
  path: string,
): number | undefined {
  const { positionByKey, scroll } = list.getState();
  const top = positionByKey(headerKey(path));

  return top !== undefined && top < scroll ? top : undefined;
}

function scrollToHeader(list: LegendListRef, path: string): void {
  const offset = scrolledAwayTop(list, path);

  if (offset !== undefined)
    void list.scrollToOffset({ offset, animated: false });
}

const scrollToFoldingHeader = (list: ListRef | null, path: string): void => {
  if (list && isLegendList(list)) scrollToHeader(list, path);
};

/*
 * A file that folds while scrolled part way would drop the reader somewhere in the files below, so its header comes to
 * the top of the list first. Everything above that header stays put, so its place is the same before and after the fold.
 */
export function useFoldScroll(setOpen: OpenFiles['setOpen']): FoldScroll {
  const ref = useRef<ListRef>(null);

  return {
    ref,
    setOpen: (path, open) => {
      if (!open) scrollToFoldingHeader(ref.current, path);
      setOpen(path, open);
    },
  };
}
