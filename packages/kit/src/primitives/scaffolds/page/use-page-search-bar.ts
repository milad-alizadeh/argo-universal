import { Stack } from 'expo-router';
import { useEffect, useRef, type ComponentProps, type RefObject } from 'react';
import type { PageProps } from './page-props';

type SearchProps = ComponentProps<typeof Stack.SearchBar>;

type SearchCommands = NonNullable<NonNullable<SearchProps['ref']>['current']>;

// The bar may mount a few frames after the Page; a route that never shows it stops trying after about five seconds.
const maxSyncFrames = 300;

export function usePageSearchBar(props: PageProps): SearchProps {
  const ref = useRef<SearchCommands | null>(null);
  // Texts the bar sent up that haven't come back as `value` yet.
  const sent = useRef<string[]>([]);
  useSearchText(ref, props.value ?? '', sent);

  const onChangeText: SearchProps['onChangeText'] = (event) => {
    sent.current.push(event.nativeEvent.text);
    props.onChangeText?.(event.nativeEvent.text);
  };

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

// Writes `value` into the bar only when it came from elsewhere, such as a Plugin's patch, never an echo of typing.
function useSearchText(
  ref: RefObject<SearchCommands | null>,
  value: string,
  sent: RefObject<string[]>,
): void {
  useEffect(() => {
    if (isEcho(sent, value)) return;

    return synchronizeSearch(ref, value);
  }, [ref, value, sent]);
}

function isEcho(sent: RefObject<string[]>, value: string): boolean {
  const index = sent.current.lastIndexOf(value);
  sent.current = index === -1 ? [] : sent.current.slice(index + 1);

  return index !== -1;
}

function synchronizeSearch(
  ref: RefObject<SearchCommands | null>,
  value: string,
): () => void {
  let frame = 0;
  let frames = 0;

  const sync = (): void => {
    if (ref.current) return ref.current.setText(value);

    if (++frames > maxSyncFrames) return;

    frame = requestAnimationFrame(sync);
  };

  sync();

  return () => cancelAnimationFrame(frame);
}
