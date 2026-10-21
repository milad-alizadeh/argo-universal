import {
  Children,
  useContext,
  useId,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Platform, View } from 'react-native';
import { FooterProvider } from '#primitives/fields/field-description';
import { flattenedChildren } from '../../../flattened-children';
import { ListFooter } from '../../../list-footer';
import { useSectionDrawing } from '../../../list-section-drawing';
import { RowHighlightProvider } from '../../../row-highlights';
import { SectionEndContext } from '../../../section-end-context';
import { ListGrouping, SectionListRow } from './list-grouping';
import type { ListSectionProps } from './list-props';
import { hasSectionHeader, SectionHeader } from './list-section-parts';

export function ListSection(props: ListSectionProps): ReactElement {
  const id = useId();
  const { below } = useSectionDrawing();
  const ends = useContext(SectionEndContext);

  return (
    <View>
      <Header {...props} />
      <SectionBody {...props} id={id} />
      <Footer {...props} id={id} />
      {!ends && <View className={below} />}
    </View>
  );
}

function Header(props: ListSectionProps): ReactNode {
  return hasSectionHeader(props) ? <SectionHeader {...props} /> : null;
}

function Rows(props: ListSectionProps): ReactNode {
  const children = flattenedChildren(props.children);

  if (props.isExpanded === false) return null;

  return Children.map(children, (child, index) => (
    <SectionListRow section={props} index={index} count={children.length}>
      {child}
    </SectionListRow>
  ));
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
      <ListGrouping>
        <RowHighlightProvider>
          <Rows {...props} />
        </RowHighlightProvider>
      </ListGrouping>
    </FooterProvider>
  );
}
