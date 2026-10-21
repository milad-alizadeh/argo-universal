import { describe, expect, it } from 'vitest';
import { cssTransition } from './motion';

describe('cssTransition', () => {
  it('writes the curve as the cubic-bezier CSS and Web Animations read', () => {
    expect(cssTransition(120, { x1: 0.1, y1: 0.2, x2: 0.3, y2: 0.4 })).toEqual({
      duration: 120,
      easing: 'cubic-bezier(0.1, 0.2, 0.3, 0.4)',
    });
  });
});
