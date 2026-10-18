import { Rectangle, VStack } from '@expo/ui/swift-ui';
import {
  type ModifierConfig,
  foregroundStyle,
  frame,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';
import { useNativeTheme } from '#lib/generic/native-theme';
import { useStackedList } from '#primitives/fields/field-layout';
import { rectangularHitArea } from '#primitives/native/native-modifiers';
import { useStackedGutter } from './stacked-gutter';
import type { StackedRowProps } from './stacked-row-props';

/*
 * A stock iOS 26 Form row, measured: 16 above and below a line of body text (54 tall), the title
 * 40 past the gutter after an icon, and a 1pt separator from the title to the trailing gutter.
 */
const cellPadding = 16;

const titleInset = 40;

const separatorWidth = 1;

/*
 * A row in a stacked list draws the cell a Form would: its padding, a full-width tap target, and
 * the separator under it, a Rectangle in Argo's border colour (Shapes/index.d.ts, foregroundStyle
 * in modifiers/index.d.ts) where the Form draws the system's.
 */
export function StackedRow(props: StackedRowProps): ReactElement {
  const stacked = useStackedList();
  const separator = useSeparatorModifiers(props);

  if (!stacked) return props.children;

  return (
    <VStack alignment="leading" spacing={0}>
      {props.children}
      <Rectangle modifiers={separator} />
    </VStack>
  );
}

function useSeparatorModifiers(props: StackedRowProps): ModifierConfig[] {
  const gutter = useStackedGutter();
  const { border } = useNativeTheme().colors;
  const leading = props.icon ? gutter + titleInset : gutter;

  return [
    ...(border ? [foregroundStyle(border)] : []),
    frame({ height: separatorWidth }),
    // The separator takes no height, as a Form's lies over the row's edge; the card clips the last one.
    padding({ leading, trailing: gutter, bottom: -separatorWidth }),
  ];
}

// The cell's own drawing, for the view inside the row's button so the whole cell takes the tap.
export function useStackedCellModifiers(): ModifierConfig[] {
  const gutter = useStackedGutter();

  if (!useStackedList()) return [];

  return [
    padding({ horizontal: gutter, vertical: cellPadding }),
    frame({ maxWidth: Infinity, alignment: 'leading' }),
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

/*
 * A stock Form's icon column: 24 wide from the gutter, the icon centred in it and the title 16
 * past it. The column takes no height, as a Label's icon does not make its row taller (a frame
 * does not clip, so the icon still draws centred on the row).
 */
const iconColumn = 24;

const iconGap = 8;

// A row's icon in a stacked list, in the column a Form gives a Label's icon; the row's own spacing adds the rest of the gap.
export function StackedIcon(props: { children: ReactElement }): ReactElement {
  if (!useStackedList()) return props.children;

  return <VStack modifiers={iconModifiers}>{props.children}</VStack>;
}

const iconModifiers = [
  frame({ width: iconColumn, height: 0 }),
  padding({ trailing: iconGap }),
];
