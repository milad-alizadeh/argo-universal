import { Column, RNHostView, Row } from '@expo/ui';
import type { ReactElement } from 'react';
import { useSpacingStep } from '#primitives/layout/spacing';
import { Grow, Line, stackModifiers } from './field-composed-row-native';
import {
  growing,
  isLayout,
  isLine,
  type ElementNode,
  type LayoutNode,
  type RowNode,
} from './field-composed-row-nodes';

type Alignment = 'start' | 'center' | 'end';

// A column's `stretch` is the container's own cross-axis fill; a row's reads as the top.
const alignments = {
  start: 'start',
  center: 'center',
  end: 'end',
  stretch: 'start',
} as const satisfies Record<string, Alignment>;

/*
 * A composed row's nodes as Expo's universal Row and Column, SwiftUI's HStack and VStack on iOS and Compose's Row and
 * Column on Android, and its lines as the rows' native text. Switch and Slider are kit elements that draw natively
 * in the Host the FieldGroup already holds; a Swatch is React Native, so it is hosted as a picker option's logo is.
 */
export function RowContent(props: {
  nodes: RowNode[];
  inRow: boolean;
}): ReactElement[] {
  const grower = props.inRow ? growing(props.nodes) : undefined;

  return props.nodes.map((node) => (
    <Placed
      key={node.key}
      node={node}
      grows={node.key === grower}
      inRow={props.inRow}
    />
  ));
}

function Placed(props: {
  node: RowNode;
  grows: boolean;
  inRow: boolean;
}): ReactElement {
  const drawn = <Drawn node={props.node} inRow={props.inRow} />;

  return props.grows ? <Grow>{drawn}</Grow> : drawn;
}

function Drawn(props: { node: RowNode; inRow: boolean }): ReactElement {
  const { node } = props;

  return isLayout(node) ? (
    <Layout node={node} inRow={props.inRow} />
  ) : (
    <Leaf node={node} />
  );
}

function Leaf({ node }: { node: Exclude<RowNode, LayoutNode> }): ReactElement {
  return isLine(node) ? (
    <Line text={node.text} role={node.role} tone={node.tone} />
  ) : (
    <Embedded node={node} />
  );
}

function Embedded({ node }: { node: ElementNode }): ReactElement {
  return node.hosted ? (
    <RNHostView matchContents>{node.element}</RNHostView>
  ) : (
    node.element
  );
}

function Layout(props: { node: LayoutNode; inRow: boolean }): ReactElement {
  const { node } = props;
  const spacing = useSpacingStep(node.gap);
  const Container = node.direction === 'row' ? Row : Column;

  return (
    <Container
      alignment={alignments[node.align]}
      spacing={spacing}
      modifiers={stackModifiers(props.inRow)}
    >
      <RowContent nodes={node.children} inRow={node.direction === 'row'} />
    </Container>
  );
}
