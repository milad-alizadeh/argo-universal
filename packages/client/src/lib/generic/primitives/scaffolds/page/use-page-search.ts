import { useState } from 'react';
import type { PageProps } from './page-props';

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
