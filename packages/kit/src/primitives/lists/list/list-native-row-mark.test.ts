import { createElement, StrictMode, Suspense } from 'react';
import { describe, expect, it } from 'vitest';
import { isNativeRow, nativeRows } from './list-native-row-mark';

const { Row } = nativeRows({ Row: () => null });

const PlainRow = (): null => null;

describe('isNativeRow', () => {
  it('is true for a component the mark is on', () => {
    expect(isNativeRow(createElement(Row))).toBe(true);
  });

  it('is false for a component without the mark', () => {
    expect(isNativeRow(createElement(PlainRow))).toBe(false);
  });

  it('is false for a host component', () => {
    expect(isNativeRow(createElement('div'))).toBe(false);
  });

  it.each([
    ['Suspense', Suspense],
    ['StrictMode', StrictMode],
  ])('is false, and does not throw, for %s', (_name, type) => {
    expect(isNativeRow(createElement(type))).toBe(false);
  });
});
