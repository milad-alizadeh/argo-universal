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

const searchIntervalMs = 250;

interface SearchedList<Item> {
  props: ListProps<Item>;
  search: ReactElement | null;
}

function usePluginSearch(
  text: string,
  props: Pick<ListProps<never>, 'searchMode' | 'onSearchTextChange'>,
): void {
  const sent = useRef({ text: '', at: 0 });

  const send = useEffectEvent(() => {
    sent.current = { text, at: Date.now() };
    props.onSearchTextChange?.(text);
  });

  useEffect(() => {
    if (props.searchMode !== 'plugin' || sent.current.text === text) return;

    const timer = setTimeout(send, searchDelay(sent.current.at));

    return (): void => clearTimeout(timer);
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

function searchDelay(last: number): number {
  return Math.max(0, searchIntervalMs - (Date.now() - last));
}
