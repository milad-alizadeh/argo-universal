import { Children, useState } from 'react';
import {
  Platform,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';
import { useSizeClassValue } from '#kit/use-size-class/use-size-class-value';
import { cn } from '#kit/utils';
import { gapClass, useSpacingStep } from '#primitives/layout/spacing';
import { useSizeClass } from '../../../use-size-class/use-size-class';
import type { KitProps } from '../../kit-props';

export type GridProps = KitProps<'Grid'>;

const phoneColumnLimit = 2;

export function Grid({ gap = 0, ...props }: GridProps): React.JSX.Element {
  const grid = useGrid(props.columns, gap);

  return (
    <View
      onLayout={grid.onLayout}
      className={cn('w-full flex-row flex-wrap items-stretch', gapClass[gap])}
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
  const spacing = useSpacingStep(gap);
  const [width, setWidth] = useState(0);

  return {
    onLayout: (event) => setWidth(event.nativeEvent.layout.width),
    cell: {
      width: Math.max(0, (width - spacing * (count - 1)) / count),
      minWidth: 0,
    },
  };
}
