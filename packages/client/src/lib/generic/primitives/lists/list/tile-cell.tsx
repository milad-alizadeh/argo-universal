import { useContext, useEffect, type ReactElement } from 'react';
import { View, type ViewStyle } from 'react-native';
import { SvgCellVisible } from '#primitives/visual';
import { TileVisibility } from './tile-visibility';

type CellProps = {
  children: ReactElement;
  index: number;
  width: number;
  gap: number;
  horizontal: boolean;
  onHeight: (index: number, height: number) => void;
};

export function TileCell(props: CellProps): ReactElement {
  const visible = useContext(TileVisibility).has(props.index);
  useReleasedHeight(props);

  return (
    <SvgCellVisible value={visible}>
      <CellFrame {...props} />
    </SvgCellVisible>
  );
}

function CellFrame(props: CellProps): ReactElement {
  return (
    <View
      onLayout={(event) => {
        if (props.horizontal)
          props.onHeight(props.index, event.nativeEvent.layout.height);
      }}
      style={cellStyle(props)}
    >
      {props.children}
    </View>
  );
}

function cellStyle({ width, gap, horizontal }: CellProps): ViewStyle {
  return horizontal
    ? { width, marginRight: gap }
    : { width: '100%', marginBottom: gap };
}

function useReleasedHeight({ index, onHeight }: CellProps): void {
  useEffect(() => (): void => onHeight(index, 0), [index, onHeight]);
}
