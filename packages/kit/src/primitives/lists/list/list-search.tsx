import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import { View } from 'react-native';
import { SearchFieldInput } from '#primitives/controls/search-field';
import type { ListProps } from './list-props';
import { filterList } from './list-search-filter';

interface SearchedList<Item> {
  props: ListProps<Item>;
  search: ReactElement | null;
}

// The wire's `throttleMs` on `onSearchTextChange` owns the pace (ADR-0031), so this sends each change.
function usePluginSearch(
  text: string,
  props: Pick<ListProps<never>, 'searchMode' | 'onSearchTextChange'>,
): void {
  const sent = useRef('');

  const send = useEffectEvent(() => {
    sent.current = text;
    props.onSearchTextChange?.(text);
  });

  useEffect(() => {
    if (props.searchMode === 'plugin' && sent.current !== text) send();
  }, [text, props.searchMode]);
}

export function useListSearch<Item>(
  props: ListProps<Item>,
): SearchedList<Item> {
  const [text, setText] = useState('');
  usePluginSearch(text, props);

  const search = props.searchMode ? (
    <View className="px-4 py-2">
      <SearchFieldInput label="Search" value={text} onChangeText={setText} />
    </View>
  ) : null;

  return { props: filterList(props, text), search };
}
