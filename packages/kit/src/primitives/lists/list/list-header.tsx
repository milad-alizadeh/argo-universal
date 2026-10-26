import { createContext, use, type ReactElement, type ReactNode } from 'react';
import { View } from 'react-native';
import { ScrollFadeView } from '../../../scroll-fade/scroll-fade';
import { useRowGutter } from './list-data';
import type { ListProps } from './list-props';

const RowGutterContext = createContext(0);

// A header row of controls that scrolls sideways: it runs to the List's edges, and its content starts where the rows' content does.
export function ListHeaderRow(props: { children: ReactNode }): ReactElement {
  return (
    <ScrollFadeView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="items-center gap-1"
      contentContainerStyle={{ paddingHorizontal: use(RowGutterContext) }}
    >
      {props.children}
    </ScrollFadeView>
  );
}

// A header lines up with the rows; one that scrolls sideways runs to the edges and takes the gutter as its content's padding.
export function ListHeader<Item>({
  list,
}: {
  list: ListProps<Item>;
}): ReactElement {
  const gutter = useRowGutter(list);

  if (list.headerBleeds)
    return <RowGutterContext value={gutter}>{list.header}</RowGutterContext>;

  return <View style={{ paddingHorizontal: gutter }}>{list.header}</View>;
}
