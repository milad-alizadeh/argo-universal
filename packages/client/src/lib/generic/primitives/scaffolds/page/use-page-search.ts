import { useState } from 'react';
import type { PageProps } from './page-props';

export function usePageSearch(
  search: PageProps['search'],
): PageProps['search'] {
  const [value, setValue] = useState(initialValue(search));

  const onChangeText = (text: string): void => {
    setValue(text);
    notify(search, text);
  };

  return search
    ? { ...search, value: controlledValue(search, value), onChangeText }
    : undefined;
}

function initialValue(search: PageProps['search']): string {
  return search?.value ?? '';
}

function controlledValue(
  search: NonNullable<PageProps['search']>,
  local: string,
): string {
  return search.onChangeText ? (search.value ?? local) : local;
}

function notify(search: PageProps['search'], text: string): void {
  search?.onChangeText?.(text);
}
