import type { ReactElement } from 'react';
import { Text, type TextProps } from '#primitives/content/text';
import { useListLook } from '../../../list-look-context';

export function RowText(props: TextProps): ReactElement {
  const role = useListLook().place === 'tray' ? 'body' : 'row';

  return <Text {...props} role={role} />;
}
