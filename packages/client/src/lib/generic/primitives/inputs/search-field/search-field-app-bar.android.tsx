import { useNativeState } from '@expo/ui/jetpack-compose';
import { type RefObject, useEffect, useRef, useState } from 'react';
import { BackHandler } from 'react-native';
import {
  AppBarSearchField,
  type FieldValue,
} from './search-field-app-bar-field.android';
import type { AppBarSearch, AppBarSearchQuery } from './search-field-props';

type Latest = RefObject<AppBarSearchQuery | undefined>;

/*
 * Material's search from the top app bar: the search button, last in the bar, opens the search in the bar itself,
 * the list filtering below it. Back, the arrow or the system's, clears the query and gives the bar back.
 */
export function useAppBarSearch(
  search: AppBarSearchQuery | undefined,
): AppBarSearch {
  const [open, setOpen] = useState(false);
  const query = useQuery(useLatest(search));
  const close = closeSearch(query, setOpen);

  useSystemBack(open, close);

  return {
    open,
    openSearch: openSearch(query, setOpen),
    close,
    ...openParts(open && search ? search.label : undefined, query),
  };
}

// Opening starts from an empty field.
function openSearch(
  query: Query,
  setOpen: (open: boolean) => void,
): () => void {
  return (): void => {
    query.emptyField();
    setOpen(true);
  };
}

/*
 * Closing clears the screen's query in the same render that gives the bar back. The field keeps its text until then:
 * emptying it now would show an empty field for a frame before the bar returns.
 */
function closeSearch(
  query: Query,
  setOpen: (open: boolean) => void,
): () => void {
  return (): void => {
    query.field.onValueChange?.('');
    setOpen(false);
  };
}

// The field and Clear while search is open; a label only while open.
function openParts(
  label: string | undefined,
  query: Query,
): Pick<AppBarSearch, 'field' | 'clear'> {
  if (label === undefined) return { field: null };

  return {
    field: <AppBarSearchField label={label} {...query.field} />,
    clear: query.hasText ? query.clear : undefined,
  };
}

interface Query {
  field: FieldValue;
  hasText: boolean;
  clear: () => void;
  emptyField: () => void;
}

// The field's own text, so typing never waits on the screen; Clear empties both.
function useQuery(latest: Latest): Query {
  const text = useNativeState('');
  const [hasText, setHasText] = useState(false);

  const change = (value: string): void => {
    setHasText(value !== '');
    latest.current?.onChangeText(value);
  };

  const emptyField = (): void => text.set('');

  return {
    field: { value: text, onValueChange: change },
    hasText,
    clear: clearBoth(emptyField, change),
    emptyField,
  };
}

function clearBoth(
  emptyField: () => void,
  change: (value: string) => void,
): () => void {
  return (): void => {
    emptyField();
    change('');
  };
}

// The screen's latest callback, for a field that keeps its own text once open.
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
