import { expect, it } from 'vitest';
import { maskPath, type RenderNode } from './story-render-rules.mts';

function nested(text: string, depth: number, visit: () => void): RenderNode {
  const children = depth === 0 ? [] : [nested(text, depth - 1, visit)];

  return {
    tag: 'div',
    attributes: '',
    text: depth === 0 ? text : '',
    get children() {
      visit();

      return children;
    },
  };
}

it('compares deep wrapper trees without revisiting each subtree exponentially', () => {
  let reads = 0;

  const visit = (): void => {
    if (++reads > 1_000)
      throw new Error('Deep comparison repeatedly visits the same subtree');
  };

  expect(
    maskPath(nested('before', 30, visit), nested('after', 30, visit)),
  ).toEqual(Array.from({ length: 30 }, () => 0));
});
