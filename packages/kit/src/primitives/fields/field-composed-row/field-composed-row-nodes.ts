import { stackDefaults, type SpacingStep } from '@repo/contracts/kit-tokens';
import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';
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
 * `layout` and `line` are drawn again, while an `element` stays the kit element, which already draws natively
 * (Switch, Slider) or is hosted from React Native (Swatch). The registry stays one component per wire name. A row reads its children by type, so a component of a story's own that wraps a
 * Stack or a Switch is not seen: call a function that returns the element instead.
 */
export type LayoutNode = {
  kind: 'layout';
  key: string;
  direction: StackProps['direction'];
  gap: SpacingStep;
  align: NonNullable<StackProps['align']>;
  children: RowNode[];
};

export type LineNode = {
  kind: 'line';
  key: string;
  text: string;
  role: TextProps['role'];
  tone: TextProps['tone'];
};

// `hosted`: React Native views, which a native row hosts rather than draws; `slider`: it takes the spare width.
export type ElementNode = {
  kind: 'element';
  key: string;
  element: ReactElement;
  hosted: boolean;
  slider: boolean;
};

export type RowNode = LayoutNode | LineNode | ElementNode;

export const isLayout = (node: RowNode): node is LayoutNode =>
  node.kind === 'layout';

export const isLine = (node: RowNode): node is LineNode => node.kind === 'line';

type Reader = (element: ReactElement<never>, key: string) => RowNode;

const stackNode = (
  element: ReactElement<StackProps>,
  key: string,
): RowNode => ({
  kind: 'layout',
  key,
  direction: element.props.direction,
  gap: element.props.gap ?? stackDefaults.gap,
  align: element.props.align ?? stackDefaults.align,
  children: rowNodes(element.props.children),
});

const textNode = (element: ReactElement<TextProps>, key: string): RowNode => ({
  kind: 'line',
  key,
  text: Children.toArray(element.props.children).join(''),
  role: element.props.role,
  tone: element.props.tone,
});

const elementNode = (element: ReactElement, key: string): RowNode => ({
  kind: 'element',
  key,
  element,
  hosted: element.type === Swatch,
  slider: element.type === Slider,
});

// The Contract allows nothing else in a row, so any other element is dropped.
const readers = new Map<unknown, Reader>([
  [Stack, stackNode],
  [Text, textNode],
  [Swatch, elementNode],
  [Switch, elementNode],
  [Slider, elementNode],
]);

const keyOf = (element: ReactElement, index: number): string =>
  String(element.key ?? index);

function nodeOf(child: ReactNode, index: number): RowNode[] {
  if (!isValidElement<never>(child)) return [];

  const read = readers.get(child.type);

  return read ? [read(child, keyOf(child, index))] : [];
}

export const rowNodes = (children: ReactNode): RowNode[] =>
  flattenedChildren(children).flatMap(nodeOf);

const takesSpace = (node: RowNode): boolean => node.kind !== 'element';

/*
 * Which child of a row of children takes the width the others leave: the Slider, else the first line or layout, so a
 * name pushes its Switch to the end and a Slider runs up to its value. SwiftUI and Compose have no flexible child
 * unless asked; the web's Stack has none either.
 */
export function growing(nodes: RowNode[]): string | undefined {
  const slider = nodes.find((node) => node.kind === 'element' && node.slider);

  return (slider ?? nodes.find(takesSpace))?.key;
}
