import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import { flattenedChildren } from '#kit/flattened-children';
import { Text, type TextProps } from '#primitives/content/text';
import { Slider } from '#primitives/controls/slider';
import { Switch } from '#primitives/controls/switch';
import { Stack, type StackProps } from '#primitives/layout/stack';
import { Swatch } from '#primitives/visual/swatch';

/*
 * What a composed row draws (ADR-0042, owner amendment 2026-11-20), read from the elements its children arrive as.
 * The registry hands a node's children to its component as the kit elements they drew (plugin-nodes.tsx), carrying
 * the Plugin's props, the echoed value and the event callbacks, and a kit component reads them by type, as a
 * FieldGroup.Section reads its rows. A native FieldGroup is a SwiftUI or Compose tree that cannot hold the React
 * Native views those elements draw, so the row reads them here and draws each one's native counterpart itself:
 * `layout` and `line` are drawn again, while `control` and `dot` stay the kit element, which already draws natively
 * (Switch, Slider) or is hosted from React Native (Swatch). The registry stays one component per wire name.
 */
export type RowNode =
  | {
      kind: 'layout';
      key: string;
      direction: StackProps['direction'];
      gap: StackProps['gap'];
      align: StackProps['align'];
      children: RowNode[];
    }
  | {
      kind: 'line';
      key: string;
      text: string;
      role: TextProps['role'];
      tone: TextProps['tone'];
    }
  | { kind: 'control'; key: string; element: ReactElement; slider: boolean }
  | { kind: 'dot'; key: string; element: ReactElement };

const keyOf = (element: ReactElement, index: number): string =>
  String(element.key ?? index);

function nodeOf(child: ReactNode, index: number): RowNode[] {
  if (!isValidElement(child)) return [];

  const key = keyOf(child, index);

  if (child.type === Stack) return [stackNode(child as ReactElement<StackProps>, key)];
  if (child.type === Text) return [textNode(child as ReactElement<TextProps>, key)];
  if (child.type === Swatch) return [{ kind: 'dot', key, element: child }];
  if (child.type === Switch || child.type === Slider)
    return [{ kind: 'control', key, element: child, slider: child.type === Slider }];

  // The Contract allows nothing else in a row.
  return [];
}

function stackNode(element: ReactElement<StackProps>, key: string): RowNode {
  const { direction, gap, align, children } = element.props;

  return { kind: 'layout', key, direction, gap, align, children: rowNodes(children) };
}

function textNode(element: ReactElement<TextProps>, key: string): RowNode {
  const { children, role, tone } = element.props;

  return { kind: 'line', key, text: Children.toArray(children).join(''), role, tone };
}

export const rowNodes = (children: ReactNode): RowNode[] =>
  flattenedChildren(children).flatMap(nodeOf);

/*
 * Which child of a row of children takes the width the others leave: the Slider, else the first line or layout, so a
 * name pushes its Switch to the end and a Slider runs up to its value. SwiftUI and Compose have no flexible child
 * unless asked; the web's Stack has none either.
 */
export function growing(nodes: RowNode[]): string | undefined {
  const flexible = nodes.find((node) => node.kind === 'control' && node.slider);

  return (flexible ?? nodes.find((node) => node.kind === 'layout' || node.kind === 'line'))?.key;
}
