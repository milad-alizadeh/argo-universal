import { describe, expect, it } from 'vitest';
import { fontScaleUpdate } from './font-scale';

const metrics = {
  window: { width: 411, height: 866, scale: 2.625, fontScale: 1 },
  screen: { width: 411, height: 914, scale: 2.625, fontScale: 1 },
};

describe('fontScaleUpdate', () => {
  it('reports the scale the person has just chosen', () => {
    expect(fontScaleUpdate(metrics, 2)).toStrictEqual({
      window: { width: 411, height: 866, scale: 2.625, fontScale: 2 },
      screen: { width: 411, height: 914, scale: 2.625, fontScale: 2 },
    });
  });

  it('leaves the sizes alone, since only the text grew', () => {
    const update = fontScaleUpdate(metrics, 1.3);

    expect(update?.window?.height).toBe(866);
  });

  it('reports nothing when the scale has not moved', () => {
    expect(fontScaleUpdate(metrics, 1)).toBeUndefined();
  });
});
