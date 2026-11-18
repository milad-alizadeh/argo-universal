import { stackDefaults } from '@repo/contracts/kit-tokens';
import { Children, type ReactElement, type ReactNode } from 'react';
import { View } from 'react-native';
import {
  ColumnPart,
  type PartLayout,
  type StackColumn,
  useStackColumn,
} from '#kit/content-column/content-column';
import { flattenedChildren } from '#kit/flattened-children';
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
  const layout = useStackColumn();

  return layout && props.direction === 'column' ? (
    <ColumnStack {...props} layout={layout} />
  ) : (
    <View className={classesOf(props)}>{props.children}</View>
  );
}

type ColumnStackProps = StackProps & { layout: StackColumn };

function ColumnStack(props: ColumnStackProps): ReactElement {
  return (
    <View className={cn(classesOf(props), fillClass(props.layout.state))}>
      {columnStackParts(props)}
    </View>
  );
}

function columnStackParts(props: ColumnStackProps): ReactNode {
  const { children, layout } = props;
  const alignment = alignClass[props.align ?? stackDefaults.align];

  return Children.map(flattenedChildren(children), (child) => (
    <ColumnPart column={layout.column} stack="child">
      {(part) => (
        <StackPart {...{ layout, part, alignment }}>{child}</StackPart>
      )}
    </ColumnPart>
  ));
}

const fillClass = ({ filled }: Pick<PartLayout, 'filled'>): string | false =>
  filled && 'min-h-0 flex-1';

interface StackPartProps {
  layout: StackColumn;
  part: PartLayout;
  alignment: string;
  children: ReactNode;
}

function StackPart(props: StackPartProps): ReactElement {
  const { layout, part, alignment, children } = props;

  const style =
    layout.state.claimed && !part.claimed ? layout.column : undefined;

  return (
    <View
      className={cn('w-full self-center', fillClass(part), alignment)}
      style={style}
    >
      {children}
    </View>
  );
}
