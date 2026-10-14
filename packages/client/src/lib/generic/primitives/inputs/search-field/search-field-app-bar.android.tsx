import type * as React from 'react';
import { type RefObject, useEffect, useRef, useState } from 'react';
import { BackHandler } from 'react-native';
import { OpenSearchHeader } from './search-field-open-bar.android';
import type { AppBarSearch, AppBarSearchQuery } from './search-field-props';

type Latest = RefObject<AppBarSearchQuery | undefined>;

/*
 * Material's search from the top app bar: the search button, last in the bar, opens a full-width search in the
 * bar's place, the list filtering below it. Back, the arrow or the system's, clears the query and gives the bar back.
 */
export function useAppBarSearch(
  search: AppBarSearchQuery | undefined,
): AppBarSearch {
  const [open, setOpen] = useState(false);
  const latest = useLatest(search);
  const close = closeSearch(latest, setOpen);

  useSystemBack(open, close);

  return {
    open,
    openSearch: () => setOpen(true),
    bar: open && search ? openBar(search.label, latest, close) : null,
  };
}

// Closing clears the query.
function closeSearch(
  latest: Latest,
  setOpen: (open: boolean) => void,
): () => void {
  return (): void => {
    latest.current?.onChangeText('');
    setOpen(false);
  };
}

function openBar(
  label: string,
  latest: Latest,
  close: () => void,
): React.JSX.Element {
  return (
    <OpenSearchHeader
      label={label}
      initialValue=""
      onChangeText={(value): void => latest.current?.onChangeText(value)}
      onClose={close}
    />
  );
}

// The screen's latest callback, for a bar that keeps its own text once open.
function useLatest(search: AppBarSearchQuery | undefined): Latest {
  const latest = useRef(search);

  useEffect(() => {
    latest.current = search;
  });

  return latest;
}

function useSystemBack(open: boolean, close: () => void): void {
  useEffect(() => {
    if (!open) return;

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      (): boolean => {
        close();

        return true;
      },
    );

    return (): void => subscription.remove();
  }, [open, close]);
}
