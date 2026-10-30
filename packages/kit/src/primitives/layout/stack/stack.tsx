import { stackDefaults } from '@repo/contracts/kit-tokens';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { gapClass } from '#primitives/layout/spacing';
import { cn } from '../../../utils';
import type { StackProps, stackAlignments } from './stack-props';

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
  gap = stackDefaults.gap,
  align = stackDefaults.align,
}: StackProps): string =>
  cn(directionClass[direction], gapClass[gap], alignClass[align]);

export function Stack(props: StackProps): ReactElement {
  return <View className={classesOf(props)}>{props.children}</View>;
}
