import { useContext, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { RowPositionContext } from '../../../list-context';
import { useCompactRows, useListLook } from '../../../list-look-context';
import { useSeparatorCovered } from '../../../row-highlights';
import { useSelectedSeparator } from './list-item-content-selection';
import { hasLeading, separatorClass } from './list-item-parts';
import type { DrawingProps } from './list-item-press';
import { ItemProgress } from './list-item-progress';
import type { ListItemProps } from './list-item-props';
import { itemSeparator, type ItemDrawing } from './list-item-styles';

// A row's props, how it draws, and whether it is a tile.
export interface RowParts {
  props: DrawingProps;
  drawing: ItemDrawing;
  tile: boolean;
}

const hairline = { height: StyleSheet.hairlineWidth };

export function useItemDrawing(
  props: Pick<ListItemProps, 'sidebar'>,
): ItemDrawing {
  const { position } = useContext(RowPositionContext);

  return {
    look: useListLook(),
    position,
    compact: useCompactRows(props.sidebar),
  };
}

type SeparatorProps = Pick<ListItemProps, 'id' | 'leadingSize'> & {
  separator: string;
};

function ItemSeparator(props: SeparatorProps): ReactNode {
  const { index } = useContext(RowPositionContext);
  const highlighted = useSeparatorCovered(index);
  const selected = useSelectedSeparator(props.id);

  if ([highlighted, selected].some(Boolean)) return null;

  return (
    <View
      className={separatorClass(props.separator, props.leadingSize)}
      style={hairline}
    />
  );
}

// Under a row that is not a tile: its separator when its List draws one, and its progress bar when it has one.
export function rowDetails({ props, drawing, tile }: RowParts): ReactNode {
  if (tile) return null;

  return (
    <>
      {separatorLine(props, itemSeparator(drawing, hasLeading(props)))}
      {progressBar(props)}
    </>
  );
}

const separatorLine = (
  props: DrawingProps,
  separator: string | undefined,
): ReactNode =>
  separator === undefined ? null : (
    <ItemSeparator
      id={props.id}
      leadingSize={props.leadingSize}
      separator={separator}
    />
  );

const progressBar = (props: DrawingProps): ReactNode =>
  props.progress ? (
    <ItemProgress progress={props.progress} sidebar={props.sidebar} />
  ) : null;
