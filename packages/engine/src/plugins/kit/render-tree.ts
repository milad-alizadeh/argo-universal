import {
  wireJsonOf,
  type WireJson,
  type WireNode,
} from '@repo/contracts/plugins/wire';
import * as React from 'react';
import { keyOfProps, toProps, type ElementProps } from './element-props';
import { toWire, type Instance } from './wire-tree';

type Drawn = React.ReactNode;

type Element = React.ReactElement<ElementProps>;

/*
 * A Loader page's Render, drawn once without React's reconciler (ADR-0050): kit components become wire
 * nodes and plain function components are called, so nothing is mounted and nothing is kept. A Render is
 * pure, so a hook fails it, and a Component event holds a value, so a function prop fails it.
 */
function renderTree(element: Drawn): WireNode {
  return toWire(onlyRoot(instancesOf(element)));
}

function onlyRoot([root, ...rest]: Instance[]): Instance {
  if (!root || rest.length > 0)
    throw new Error('A Render returns one kit component');

  return root;
}

const isEmpty = (node: Drawn): node is null | undefined | boolean =>
  node === null || node === undefined || typeof node === 'boolean';

// `key` is a keyed function component's own, which the one node it draws takes when it has none.
function instancesOf(node: Drawn, key?: string): Instance[] {
  if (isEmpty(node)) return [];

  if (Array.isArray(node))
    return node.flatMap((child: Drawn) => instancesOf(child));

  return elementOf(node, key);
}

function elementOf(node: Drawn, key: string | undefined): Instance[] {
  if (!React.isValidElement<ElementProps>(node))
    throw new Error(notElement(node));

  return elementInstances(node, node.key ?? key);
}

const notElement = (node: Drawn): string =>
  node instanceof Promise
    ? 'A Render is synchronous: the Loader awaits'
    : 'Text must be inside a Text component';

function elementInstances(
  element: Element,
  key: string | undefined,
): Instance[] {
  const { type, props } = element;

  if (type === React.Fragment) return instancesOf(props.children);

  if (typeof type === 'string') return [hostInstance(type, props, key)];

  return calledInstances(element, key);
}

function hostInstance(
  type: string,
  props: ElementProps,
  key: string | undefined,
): Instance {
  return {
    type,
    key: keyOfProps(props) ?? key,
    props: toProps(type, props),
    children: instancesOf(props.children),
  };
}

type Constructor = React.JSXElementConstructor<ElementProps>;

type Plain = (props: ElementProps) => Drawn;

// A class component's prototype extends React's; anything else callable is a plain function component.
const isPlain = (type: Constructor): type is Plain =>
  !(type.prototype instanceof React.Component);

function calledInstances(
  { type, props }: Element,
  key: string | undefined,
): Instance[] {
  if (typeof type === 'string' || !isPlain(type))
    throw new Error('A Render draws kit components and plain functions only');

  return instancesOf(called(type, props), key);
}

// Outside React a hook finds no dispatcher and throws; the Plugin is told why in its own terms.
function called(component: Plain, props: ElementProps): Drawn {
  try {
    return component(props);
  } catch (error) {
    throw hookUse(
      component.name,
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}

function hookUse(name: string, error: Error): Error {
  if (!/hook|reading 'use/iu.test(error.message)) return error;

  return new Error(
    `${name || 'A component'} calls a hook, and a Render is pure`,
  );
}

// The tree through JSON, so only values cross to the host.
export const valuesOf = (element: Drawn): WireJson =>
  wireJsonOf(renderTree(element));
