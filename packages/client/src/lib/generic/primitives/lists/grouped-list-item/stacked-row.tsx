import type { ColumnProps } from '@expo/ui';
import type { ReactElement } from 'react';
import type { StackedRowProps } from './stacked-row-props';

// Android's stock ListItem and the web's row draw their own cell in any list.
export function StackedRow(props: StackedRowProps): ReactElement {
  return props.children;
}

export function useStackedCellModifiers(): NonNullable<
  ColumnProps['modifiers']
> {
  return [];
}

export function StackedCell(props: StackedRowProps): ReactElement {
  return props.children;
}

export function StackedIcon(props: { children: ReactElement }): ReactElement {
  return props.children;
}
