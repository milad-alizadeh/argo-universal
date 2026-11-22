import { createElement, Fragment } from 'react';
import { expect, it } from 'vitest';
import { markedComponent } from './component-mark';
import { isKitElement, kitChildrenOf, kitElementType } from './typed-children';
import { wrappingComponent } from './wrapped-component';

const Row = markedComponent('test-row', (_props: { id?: string }) => null);

const Cell = markedComponent('test-cell', (_props: { id?: string }) => null);

const WrappedRow = wrappingComponent(() => null, Row);

const WrappedTwice = wrappingComponent(() => null, WrappedRow);

const ids = (children: readonly { props: { id?: string } }[]): unknown[] =>
  children.map((child) => child.props.id);

it('reads the children of a kit type, in order, and leaves the others out', () => {
  const read = kitChildrenOf<{ id?: string }>(
    [
      createElement(Row, { id: 'a' }),
      createElement(Cell, { id: 'x' }),
      createElement(Row, { id: 'b' }),
      createElement('div'),
      'text',
      null,
    ],
    Row,
  );

  expect(ids(read)).toEqual(['a', 'b']);
});

it('sees through Fragments, nested ones too', () => {
  const read = kitChildrenOf<{ id?: string }>(
    createElement(
      Fragment,
      null,
      createElement(Row, { id: 'a' }),
      createElement(Fragment, null, createElement(Row, { id: 'b' })),
    ),
    Row,
  );

  expect(ids(read)).toEqual(['a', 'b']);
});

it('keeps keys unique across Fragments', () => {
  const read = kitChildrenOf<{ id?: string }>(
    [
      createElement(Fragment, { key: 'f' }, createElement(Row, { key: 'r' })),
      createElement(Row, { key: 'r' }),
    ],
    Row,
  );

  expect(new Set(read.map((child) => child.key)).size).toBe(2);
});

it('reads a wrapper as the kit component it draws in place of', () => {
  const read = kitChildrenOf<{ id?: string }>(
    [
      createElement(WrappedRow, { id: 'a' }),
      createElement(Row, { id: 'b' }),
      createElement(WrappedTwice, { id: 'c' }),
    ],
    Row,
  );

  expect(ids(read)).toEqual(['a', 'b', 'c']);
});

it('sees a wrapper inside a Fragment', () => {
  const read = kitChildrenOf<{ id?: string }>(
    createElement(Fragment, null, createElement(WrappedRow, { id: 'a' })),
    Row,
  );

  expect(ids(read)).toEqual(['a']);
});

it('tells whether one node is of a kit type', () => {
  expect(isKitElement(createElement(WrappedRow), Row)).toBe(true);
  expect(isKitElement(createElement(Cell), Row)).toBe(false);
  expect(isKitElement('text', Row)).toBe(false);
  expect(isKitElement(null, Row)).toBe(false);
});

it('names the kit type of a node, for a parent that dispatches on it', () => {
  expect(kitElementType(createElement(WrappedRow))).toBe(Row);
  expect(kitElementType(createElement('div'))).toBe('div');
  expect(kitElementType('text')).toBeUndefined();
});
