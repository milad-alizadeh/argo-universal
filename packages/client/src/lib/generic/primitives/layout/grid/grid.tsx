import { Children, useState } from 'react';
import {
  Platform,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';
import { useSizeClass } from '#lib/generic/use-size-class/use-size-class';
import { useSizeClassValue } from '#lib/generic/use-size-class/use-size-class-value';
import { useSpacing } from '#lib/generic/use-spacing';
import { cn } from '#lib/generic/utils';
import { stackGapClass } from '../../../spacing-classes';
import type { KitProps } from '../../kit-props';

export type GridProps = KitProps<'Grid'>;

const phoneColumnLimit = 2;

export function Grid({ gap = 0, ...props }: GridProps): React.JSX.Element {
  const grid = useGrid(props.columns, gap);

  return (
    <View
      onLayout={grid.onLayout}
      className={cn('flex-row flex-wrap items-stretch', stackGapClass[gap])}
    >
      {Children.map(props.children, (child) => (
        <View style={grid.cell}>{child}</View>
      ))}
    </View>
  );
}

function useColumnCount(columns: GridProps['columns']): number {
  const requested = useSizeClassValue(columns);
  const sizeClass = useSizeClass();

  return Platform.OS !== 'web' && sizeClass === 'compact'
    ? Math.min(requested, phoneColumnLimit)
    : requested;
}

interface GridLayout {
  onLayout: (event: LayoutChangeEvent) => void;
  cell: ViewStyle;
}

function useGrid(
  columns: GridProps['columns'],
  gap: NonNullable<GridProps['gap']>,
): GridLayout {
  const count = useColumnCount(columns);
  const spacing = useSpacing(`--spacing-${gap}`) || 0;
  const [width, setWidth] = useState(0);

  return {
    onLayout: (event) => setWidth(event.nativeEvent.layout.width),
    cell: {
      width: Math.max(0, (width - spacing * (count - 1)) / count),
      minWidth: 0,
    },
  };
}
