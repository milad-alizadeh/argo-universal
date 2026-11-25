import { createElement } from 'react';
import { expect, it } from 'vitest';
import { isMarkedElement, markedComponent } from './component-mark';
import { kitTypeOf, wrappingComponent } from './wrapped-component';

const Row = markedComponent('test-row', () => null);

const wrapped = wrappingComponent(() => null, Row);

it('reads a wrapper as the component it draws in place of', () => {
  expect(kitTypeOf(createElement(wrapped))).toBe(Row);
  expect(kitTypeOf(createElement(Row))).toBe(Row);
  expect(kitTypeOf(createElement('div'))).toBe('div');
});

it('keeps the marks the wrapped component wore', () => {
  expect(isMarkedElement('test-row', createElement(wrapped))).toBe(true);
  expect(isMarkedElement('test-other', createElement(wrapped))).toBe(false);
});
