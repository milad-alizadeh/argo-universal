import {
  Children,
  useContext,
  useId,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { View } from 'react-native';
import { flattenedChildren } from '../../../flattened-children';
import { ListContext, listPosition } from '../../../list-context';
import { useSectionDrawing } from '../../../list-section-drawing';
import { createRowGroupEnds } from '../../../row-group-ends';
import { RowHighlightProvider } from '../../../row-highlights';
import { SectionEndContext } from '../../../section-end-context';
import type { ListSectionProps } from './list-props';
import {
  prepareSection,
  SectionContent,
  type SectionState,
} from './list-section-state';

export function ListSection(props: ListSectionProps): ReactElement {
  const section = prepareSection(props, useId());
  const { below } = useSectionDrawing();
  const ends = useContext(SectionEndContext);

  return (
    <View>
      {section.header}
      <SectionBody section={section} />
      {section.footer}
      {!ends && <View className={below} />}
    </View>
  );
}

function Rows({ section: prepared }: { section: SectionState }): ReactNode {
  const children = flattenedChildren(prepared.children);

  const [groupEnds] = useState(createRowGroupEnds);

  const section = {
    ...useContext(ListContext),
    ...prepared.selection,
    groupEnds,
  };

  return Children.map(children, (child, index) => (
    <ListContext value={{ ...section, ...rowPlace(index, children.length) }}>
      {child}
    </ListContext>
  ));
}

function rowPlace(
  index: number,
  count: number,
): Pick<React.ContextType<typeof ListContext>, 'position' | 'index'> {
  return { position: listPosition(index === 0, index === count - 1), index };
}

function SectionBody({ section }: { section: SectionState }): ReactElement {
  return (
    <SectionContent section={section}>
      <RowHighlightProvider>
        <Rows section={section} />
      </RowHighlightProvider>
    </SectionContent>
  );
}
