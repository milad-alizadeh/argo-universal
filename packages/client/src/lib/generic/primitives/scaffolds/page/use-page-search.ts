import { useState } from 'react';
import type { PageProps } from './page-props';

// A Page's search text: the caller's when it passes `value`, otherwise the Page's own.
export function usePageSearch(
  props: PageProps,
): Pick<PageProps, 'value' | 'onChangeText'> {
  const [local, setLocal] = useState(props.value ?? '');

  const onChangeText = (text: string): void => {
    setLocal(text);
    props.onChangeText?.(text);
  };

  return { value: props.value ?? local, onChangeText };
}
