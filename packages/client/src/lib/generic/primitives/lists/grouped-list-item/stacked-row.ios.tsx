import { Divider, VStack } from '@expo/ui/swift-ui';
import {
  type ModifierConfig,
  frame,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';
import { useStackedList } from '#primitives/fields/field-layout';
import { rectangularHitArea } from '#primitives/native/native-modifiers';
import { type StackedRowProps, stackedCellGutter } from './stacked-row-props';

// A Form row's height and vertical padding, and where its separator starts after an icon.
const cellHeight = 52;

const cellPadding = 11;

const iconInset = 56;

/*
 * A row in a stacked list draws the cell a Form would: its padding and height, a full-width tap
 * target, and the separator under it (Divider/index.d.ts).
 */
export function StackedRow(props: StackedRowProps): ReactElement {
  const stacked = useStackedList();

  if (!stacked) return props.children;

  return (
    <VStack alignment="leading" spacing={0}>
      {props.children}
      <Divider modifiers={[padding({ leading: separatorStart(props) })]} />
    </VStack>
  );
}

const separatorStart = (props: StackedRowProps): number =>
  props.icon ? iconInset : stackedCellGutter;

// The cell's own drawing, for the view inside the row's button so the whole cell takes the tap.
export function useStackedCellModifiers(): ModifierConfig[] {
  if (!useStackedList()) return [];

  return [
    padding({ horizontal: stackedCellGutter, vertical: cellPadding }),
    frame({ minHeight: cellHeight, maxWidth: Infinity, alignment: 'leading' }),
    rectangularHitArea(),
  ];
}

// A whole row in a stacked list, such as a text field, in a cell of its own.
export function StackedCell(props: StackedRowProps): ReactElement {
  const cell = useStackedCellModifiers();

  if (cell.length === 0) return props.children;

  return (
    <StackedRow icon={props.icon}>
      <VStack alignment="leading" spacing={0} modifiers={cell}>
        {props.children}
      </VStack>
    </StackedRow>
  );
}
