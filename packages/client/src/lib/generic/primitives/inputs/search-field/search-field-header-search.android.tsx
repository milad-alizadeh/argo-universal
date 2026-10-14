import type * as React from 'react';
import { type RefObject, useEffect, useRef, useState } from 'react';
import { BackHandler } from 'react-native';
import {
  type ShowHeaderSearch,
  useHeaderSearchSlot,
} from './search-field-header-slot';
import { OpenSearchHeader } from './search-field-open-bar.android';
import type { DockedSearchQuery } from './search-field-props';

export interface HeaderSearch {
  open: boolean;
  // Whether the open search took the app bar's place; without an app bar it opens where the bar was.
  inHeader: boolean;
  openSearch: () => void;
  close: () => void;
}

type Latest = RefObject<DockedSearchQuery>;

/*
 * Gmail's search: the bar at rest opens a full-screen search in the app bar's place, the list filtering below it.
 * Back, the arrow or the system's, clears the query and gives the app bar back.
 */
export function useHeaderSearch(props: DockedSearchQuery): HeaderSearch {
  // A query left over from before, such as a restored screen, keeps search open.
  const [open, setOpen] = useState(props.value !== '');
  const latest = useLatest(props);
  const show = useHeaderSearchSlot();
  const close = closeSearch(latest, setOpen);

  useHeaderBar({ open, show, latest, close });
  useSystemBack(open, close);

  return {
    open,
    inHeader: show !== null,
    openSearch: () => setOpen(true),
    close,
  };
}

// Closing clears the query.
function closeSearch(
  latest: Latest,
  setOpen: (open: boolean) => void,
): () => void {
  return (): void => {
    latest.current.onChangeText('');
    setOpen(false);
  };
}

// The caller's latest query and callback, for an app bar set once when search opens.
function useLatest(props: DockedSearchQuery): Latest {
  const latest = useRef(props);

  useEffect(() => {
    latest.current = props;
  });

  return latest;
}

interface HeaderBarOptions {
  open: boolean;
  show: ShowHeaderSearch | null;
  latest: Latest;
  close: () => void;
}

function useHeaderBar({ open, show, latest, close }: HeaderBarOptions): void {
  useEffect(() => {
    if (!open || !show) return;
    show(openHeader(latest, close));

    return (): void => show(null);
  }, [open, show, latest, close]);
}

function openHeader(latest: Latest, close: () => void): React.JSX.Element {
  return (
    <OpenSearchHeader
      label={latest.current.label}
      initialValue={latest.current.value}
      onChangeText={(value): void => latest.current.onChangeText(value)}
      onClose={close}
    />
  );
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
