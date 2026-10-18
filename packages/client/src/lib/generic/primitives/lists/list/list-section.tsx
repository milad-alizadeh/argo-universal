import {
  Children,
  useContext,
  useId,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Platform, View } from 'react-native';
import { FooterProvider } from '#primitives/fields/field-description';
import { ListContext, listPosition } from '../../../list-context';
import { ListFooter } from '../../../list-footer';
import { flattenedChildren } from './list-child-nodes';
import type { ListSectionProps } from './list-props';
import { SectionHeader } from './list-section-parts';

export function ListSection(props: ListSectionProps): ReactElement {
  const id = useId();

  return (
    <View className="mb-4">
      <Header {...props} />
      <SectionBody {...props} id={id} />
      <Footer {...props} id={id} />
    </View>
  );
}

function Header(props: ListSectionProps): ReactNode {
  const hasHeader = [props.title, props.leading, props.onExpandedChange].some(
    Boolean,
  );

  return hasHeader ? <SectionHeader {...props} /> : null;
}

function Rows(props: ListSectionProps): ReactNode {
  const children = flattenedChildren(props.children);

  const selection = { ...useContext(ListContext), ...selectionContext(props) };

  if (props.isExpanded === false) return null;

  return Children.map(children, (child, index) => (
    <ListContext
      value={{
        ...selection,
        position: listPosition(index === 0, index === children.length - 1),
      }}
    >
      {child}
    </ListContext>
  ));
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
      <Rows {...props} />
    </FooterProvider>
  );
}
