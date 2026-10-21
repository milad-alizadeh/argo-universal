import { List } from '@repo/kit/primitives/lists/list';
import type { ReactElement } from 'react';
import type { TextFieldsProps } from './elicitation-text-fields-props';

export function TextFields(props: TextFieldsProps): ReactElement {
  return <List.Section {...props} />;
}
