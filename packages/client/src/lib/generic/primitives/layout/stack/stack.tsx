import type { ReactElement } from 'react';
import { View } from 'react-native';
import { cn } from '../../../utils';
import {
  stackGapClass,
  type StackProps,
  type stackAlignments,
} from './stack-props';

const directionClass = {
  row: 'flex-row',
  column: 'flex-col',
} as const satisfies Record<StackProps['direction'], string>;

const alignClass = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
} as const satisfies Record<(typeof stackAlignments)[number], string>;

const classesOf = ({
  direction,
  gap = 0,
  align = 'stretch',
}: StackProps): string =>
  cn(directionClass[direction], stackGapClass[gap], alignClass[align]);

export function Stack(props: StackProps): ReactElement {
  return <View className={classesOf(props)}>{props.children}</View>;
}
