import {
  Children,
  useContext,
  useId,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Platform, View } from 'react-native';
import { FooterProvider } from '#primitives/fields/field-description';
import { flattenedChildren } from '../../../flattened-children';
import { ListContext, listPosition } from '../../../list-context';
import { ListFooter } from '../../../list-footer';
import { useSectionDrawing } from '../../../list-section-drawing';
import { createRowGroupEnds } from '../../../row-group-ends';
import { RowHighlightProvider } from '../../../row-highlights';
import type { ListSectionProps } from './list-props';
import { hasSectionHeader, SectionHeader } from './list-section-parts';

export function ListSection(props: ListSectionProps): ReactElement {
  const id = useId();
  const { below } = useSectionDrawing();

  return (
    <View>
      <Header {...props} />
      <SectionBody {...props} id={id} />
      <Footer {...props} id={id} />
      <View className={below} />
    </View>
  );
}

function Header(props: ListSectionProps): ReactNode {
  return hasSectionHeader(props) ? <SectionHeader {...props} /> : null;
}

function Rows(props: ListSectionProps): ReactNode {
  const children = flattenedChildren(props.children);

  const [groupEnds] = useState(createRowGroupEnds);

  const section = {
    ...useContext(ListContext),
    ...selectionContext(props),
    groupEnds,
  };

  if (props.isExpanded === false) return null;

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

function selectionContext(
  props: ListSectionProps,
): Partial<React.ContextType<typeof ListContext>> {
  return props.selectionMode
    ? {
        selectionMode: props.selectionMode,
        selection: props.selection,
        onSelectionChange: props.onSelectionChange,
      }
    : {};
}

function Footer(props: ListSectionProps & { id: string }): ReactNode {
  if (Platform.OS === 'android' || !props.footer) return null;

  return <ListFooter id={props.id} text={props.footer} tone={props.tone} />;
}

function SectionBody(props: ListSectionProps & { id: string }): ReactElement {
  const footer = props.footer
    ? { id: props.id, failure: props.tone === 'danger' }
    : undefined;

  return (
    <FooterProvider value={footer}>
      <RowHighlightProvider>
        <Rows {...props} />
      </RowHighlightProvider>
    </FooterProvider>
  );
}
