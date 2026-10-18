import { Stack } from 'expo-router';
import {
  useCallback,
  useEffect,
  useRef,
  type ComponentProps,
  type RefObject,
} from 'react';
import type { PageProps } from './page-props';

type SearchProps = ComponentProps<typeof Stack.SearchBar>;

type SearchCommands = NonNullable<NonNullable<SearchProps['ref']>['current']>;

export function usePageSearchBar(props: PageProps): SearchProps {
  const ref = useRef<SearchCommands | null>(null);
  const nativeValue = useRef('');
  const change = props.onChangeText;
  useSearchText(ref, props.value ?? '', nativeValue);

  const onChangeText = useCallback<NonNullable<SearchProps['onChangeText']>>(
    (event) => {
      nativeValue.current = event.nativeEvent.text;
      change?.(event.nativeEvent.text);
    },
    [change],
  );

  return { ref, ...searchConfiguration(props), onChangeText };
}

function searchConfiguration(props: PageProps): SearchProps {
  const clear = (): void => props.onChangeText?.('');

  return {
    placeholder: props.search?.label,
    onClose: clear,
    onCancelButtonPress: clear,
    onFocus: props.onFocus,
    onBlur: props.onBlur,
  };
}

function useSearchText(
  ref: RefObject<SearchCommands | null>,
  value: string,
  nativeValue: RefObject<string>,
): void {
  useEffect(() => {
    if (nativeValue.current === value) return;

    return synchronizeSearch(ref, value, nativeValue);
  }, [ref, value, nativeValue]);
}

function synchronizeSearch(
  ref: RefObject<SearchCommands | null>,
  value: string,
  nativeValue: RefObject<string>,
): () => void {
  let frame = 0;

  const sync = (): void => {
    if (applySearchText(ref, value, nativeValue)) return;
    frame = requestAnimationFrame(sync);
  };

  sync();

  return () => cancelAnimationFrame(frame);
}

function applySearchText(
  ref: RefObject<SearchCommands | null>,
  value: string,
  nativeValue: RefObject<string>,
): boolean {
  if (!ref.current) return false;
  ref.current.setText(value);
  nativeValue.current = value;

  return true;
}
