import type { ReactElement } from 'react';
import { List } from '#primitives/lists/list';
import type { TextFieldsProps } from './elicitation-text-fields-props';

export function TextFields(props: TextFieldsProps): ReactElement {
  return <List.Section {...props} />;
}
