import { Children, useId, type ReactElement, type ReactNode } from 'react';
import { View } from 'react-native';
import { flattenedChildren } from '../../../flattened-children';
import { useListLook } from '../../../list-look-context';
import { RowHighlightProvider } from '../../../row-highlights';
import { ListGrouping, SectionListRow } from './list-grouping';
import type { ListSectionProps } from './list-props';
import { prepareSection, type SectionState } from './list-section-state';

export function ListSection(props: ListSectionProps): ReactElement {
  const { section: drawing, sectionEnds, footerShown } = useListLook();
  const section = prepareSection(props, useId(), footerShown);

  return (
    <View>
      {section.header}
      <SectionBody section={section} />
      {section.footer}
      {!sectionEnds && <View className={drawing.below} />}
    </View>
  );
}

function Rows({ section: prepared }: { section: SectionState }): ReactNode {
  const children = flattenedChildren(prepared.children);

  return Children.map(children, (child, index) => (
    <SectionListRow
      section={prepared.selection}
      index={index}
      count={children.length}
    >
      {child}
    </SectionListRow>
  ));
}

function SectionBody({ section }: { section: SectionState }): ReactElement {
  return (
    <ListGrouping>
      <RowHighlightProvider>
        <Rows section={section} />
      </RowHighlightProvider>
    </ListGrouping>
  );
}
