import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';
import { View } from 'react-native';
import { cn } from '#lib/utils';

type Item = ReactElement<{ className?: string }>;

function isItem(child: ReactNode): child is Item {
  return isValidElement(child);
}

interface ButtonGroupProps {
  // Each child passes className on to its Button.
  children: ReactNode;
  className?: string;
}

function joinButton(item: Item, index: number, count: number): ReactElement {
  return cloneElement(item, {
    className: cn(
      item.props.className,
      index > 0 && 'rounded-l-none',
      index < count - 1 && 'rounded-r-none',
    ),
  });
}

// Joins buttons edge to edge: no gap, and no corner radius where two meet.
function ButtonGroup({ children, className }: ButtonGroupProps): ReactElement {
  const items = Children.toArray(children).filter(isItem);
  return (
    <View className={cn('flex-row', className)}>
      {items.map((item, index) => joinButton(item, index, items.length))}
    </View>
  );
}

export { ButtonGroup };
