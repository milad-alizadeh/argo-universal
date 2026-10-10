import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';

type Item = ReactElement<{ className?: string }>;

function isItem(child: ReactNode): child is Item {
  return isValidElement(child);
}

interface ButtonGroupProps {
  // Each child passes className on to its Button.
  children: ReactNode;
  className?: string;
}

// Joins buttons edge to edge: no gap, and no corner radius where two meet.
function ButtonGroup({ children, className }: ButtonGroupProps) {
  const items = Children.toArray(children).filter(isItem);
  return (
    <View className={cn('flex-row', className)}>
      {items.map((item, index) =>
        cloneElement(item, {
          className: cn(
            item.props.className,
            index > 0 && 'rounded-l-none',
            index < items.length - 1 && 'rounded-r-none',
          ),
        }),
      )}
    </View>
  );
}

export { ButtonGroup };
