import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/content/text';
import { Stack } from '#primitives/layout/stack';
import {
  growing,
  isLayout,
  isLine,
  rowNodes,
  type LayoutNode,
  type LineNode,
  type RowNode,
} from './field-composed-row-nodes';

/*
 * The web draws the row's tree with the kit's own Stack and Text in Expo's universal FieldGroup row, which draws the
 * surface, insets and separators. The child that takes the spare width gets a flexible View around it, as the
 * native drawings give it theirs.
 */
export function FieldComposedRow(props: {
  children?: ReactNode;
}): ReactElement {
  return <>{drawnNodes(rowNodes(props.children), false)}</>;
}

// Called, not rendered, so a Stack reads its children as the elements they are.
function drawnNodes(nodes: RowNode[], inRow: boolean): ReactElement[] {
  const grower = inRow ? growing(nodes) : undefined;

  return nodes.map((node) =>
    node.key === grower ? (
      <View key={node.key} className="min-w-0 flex-1">
        <Drawn node={node} />
      </View>
    ) : (
      <Drawn key={node.key} node={node} />
    ),
  );
}

function Drawn({ node }: { node: RowNode }): ReactElement {
  return isLayout(node) ? <Layout node={node} /> : <Leaf node={node} />;
}

function Leaf({ node }: { node: Exclude<RowNode, LayoutNode> }): ReactElement {
  return isLine(node) ? <Line node={node} /> : node.element;
}

function Layout({ node }: { node: LayoutNode }): ReactElement {
  return (
    <Stack direction={node.direction} gap={node.gap} align={node.align}>
      {drawnNodes(node.children, node.direction === 'row')}
    </Stack>
  );
}

function Line({ node }: { node: LineNode }): ReactElement {
  return (
    <Text role={node.role} tone={node.tone}>
      {node.text}
    </Text>
  );
}
