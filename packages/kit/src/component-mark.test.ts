import { createElement, StrictMode, Suspense } from 'react';
import { describe, expect, it } from 'vitest';
import { isMarkedElement, markedComponent } from './component-mark';

const Row = markedComponent('TestRow', () => null);

// The same file run again by a hot reload: another function under the same mark.
const ReloadedRow = markedComponent('TestRow', () => null);

const OtherRow = markedComponent('TestOtherRow', () => null);

const PlainRow = (): null => null;

describe('isMarkedElement', () => {
  it('is true for an element of the marked component', () => {
    expect(isMarkedElement('TestRow', createElement(Row))).toBe(true);
  });

  it('is true for an element of the component a reload replaced', () => {
    expect(Row).not.toBe(ReloadedRow);
    expect(isMarkedElement('TestRow', createElement(ReloadedRow))).toBe(true);
  });

  it('is false for a component under another mark, or under none', () => {
    expect(isMarkedElement('TestRow', createElement(OtherRow))).toBe(false);
    expect(isMarkedElement('TestRow', createElement(PlainRow))).toBe(false);
  });

  it.each([
    ['a host component', 'div'],
    ['Suspense', Suspense],
    ['StrictMode', StrictMode],
  ])('is false, and does not throw, for %s', (_name, type) => {
    expect(isMarkedElement('TestRow', createElement(type))).toBe(false);
  });

  it('is false for what is not an element', () => {
    expect(isMarkedElement('TestRow', 'text')).toBe(false);
    expect(isMarkedElement('TestRow', null)).toBe(false);
  });
});
