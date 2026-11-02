import { stackDefaults } from '@repo/contracts/kit-tokens';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { gapClass } from '#primitives/layout/spacing';
import { useSizeClassValue } from '../../../use-size-class/use-size-class-value';
import { cn } from '../../../utils';
import type { StackProps, stackAlignments } from './stack-props';

const directionClass = {
  row: 'flex-row',
  column: 'flex-col',
  'column-reverse': 'flex-col-reverse',
} as const;

const alignClass = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
} as const satisfies Record<(typeof stackAlignments)[number], string>;

const classesOf = ({
  gap = stackDefaults.gap,
  align = stackDefaults.align,
}: StackProps): string => cn(gapClass[gap], alignClass[align]);

export function Stack(props: StackProps): ReactElement {
  const direction = directionClass[useSizeClassValue(props.direction)];

  return (
    <View className={cn(direction, classesOf(props))}>{props.children}</View>
  );
}
