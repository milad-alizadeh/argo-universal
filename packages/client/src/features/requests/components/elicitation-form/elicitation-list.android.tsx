import { useState, type ReactElement, type ReactNode } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { GroupedList } from '#primitives/lists/grouped-list';
import { SizeClass } from '../../../../lib/generic/size-class/size-class';

// The rows may take this share of the screen before they scroll, so the actions under them stay in view.
const tallestShare = 0.6;

/*
 * Material's sheet is as tall as its content, but the rows' own scroller has no height of its own
 * there, so the rows are given the height they report, up to a share of the screen.
 */
type ListProps = { children: ReactNode };

export function ElicitationList({ children }: ListProps): ReactElement {
  return (
    <SizeClass
      compact={<SheetRows>{children}</SheetRows>}
      wide={<GroupedList fit>{children}</GroupedList>}
    />
  );
}

function SheetRows({ children }: ListProps): ReactElement {
  const [height, setHeight] = useState(0);
  const tallest = useWindowDimensions().height * tallestShare;

  return (
    <View style={{ height: Math.min(height, tallest) }}>
      <GroupedList fit onContentHeightChange={setHeight}>
        {children}
      </GroupedList>
    </View>
  );
}
