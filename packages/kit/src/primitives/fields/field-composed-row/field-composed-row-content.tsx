import { Column, RNHostView, Row } from '@expo/ui';
import { stackDefaults } from '@repo/contracts/kit-tokens';
import type { ReactElement } from 'react';
import { useSpacingStep } from '#primitives/layout/spacing';
import { Grow, Line, stackModifiers } from './field-composed-row-native';
import { growing, type RowNode } from './field-composed-row-nodes';

type Alignment = 'start' | 'center' | 'end';

// A column's `stretch` is the container's own cross-axis fill; a row's reads as the top.
const alignments = {
  start: 'start',
  center: 'center',
  end: 'end',
  stretch: 'start',
} as const satisfies Record<string, Alignment>;

type Placed = { nodes: RowNode[]; inRow: boolean };

/*
 * A composed row's nodes as Expo's universal Row and Column, SwiftUI's HStack and VStack on iOS and Compose's Row and
 * Column on Android, and its lines as the rows' native text. Switch and Slider are kit elements that draw natively
 * in the Host the FieldGroup already holds; a Swatch is React Native, so it is hosted as a picker option's logo is.
 */
export function RowContent({ nodes, inRow }: Placed): ReactElement[] {
  const grower = inRow ? growing(nodes) : undefined;

  return nodes.map((node) => (
    <Placed key={node.key} node={node} grows={node.key === grower} inRow={inRow} />
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

  switch (node.kind) {
    case 'layout':
      return <Layout node={node} inRow={props.inRow} />;
    case 'line':
      return <Line text={node.text} role={node.role} tone={node.tone} />;
    case 'dot':
      return <RNHostView matchContents>{node.element}</RNHostView>;
    case 'control':
      return node.element;
  }
}

function Layout(props: {
  node: Extract<RowNode, { kind: 'layout' }>;
  inRow: boolean;
}): ReactElement {
  const { node } = props;
  const spacing = useSpacingStep(node.gap ?? stackDefaults.gap);
  const Container = node.direction === 'row' ? Row : Column;

  return (
    <Container
      alignment={alignments[node.align ?? stackDefaults.align]}
      spacing={spacing}
      modifiers={stackModifiers(props.inRow)}
    >
      <RowContent nodes={node.children} inRow={node.direction === 'row'} />
    </Container>
  );
}
