import { describe, expect, it } from 'vitest';
import { drawnView, hasWebGL } from './webgl';

describe('drawn view', () => {
  it.each([
    ['3d', true, '3d'],
    ['3d', false, 'flat'],
    ['flat', true, 'flat'],
    ['flat', false, 'flat'],
  ] as const)('draws %s with WebGL %s as %s', (view, webgl, drawn) => {
    expect(drawnView(view, webgl)).toBe(drawn);
  });
});

describe('WebGL probe', () => {
  it('finds WebGL when the canvas returns a context', () => {
    expect(hasWebGL({ getContext: () => ({}) })).toBe(true);
  });

  it('falls back to WebGL 1 when WebGL 2 is refused', () => {
    const canvas = {
      getContext: (id: string): object | null => (id === 'webgl' ? {} : null),
    };

    expect(hasWebGL(canvas)).toBe(true);
  });

  it('reports no WebGL when the canvas refuses a context', () => {
    expect(hasWebGL({ getContext: () => null })).toBe(false);
  });
});
