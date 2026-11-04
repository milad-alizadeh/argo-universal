import type { WireJson, WireNode } from '@repo/contracts/plugins/wire';
import { pluginPageBytes } from '@repo/contracts/plugins/wire-limits';
import { expect, it } from 'vitest';
import { checkedTree } from './checked-tree';
import { leaf, stack, svg } from './tree-fixtures';

const json = (node: WireNode): WireJson => JSON.parse(JSON.stringify(node));

const large: WireNode = {
  ...stack(
    Array.from({ length: 9000 }, (_, index) => ({
      ...stack([]),
      key: String(index),
      props: { direction: 'row', gap: 7 },
    })),
  ),
};

it('refuses a page that becomes too large only after invalid containers become Update Argo', () => {
  expect(Buffer.byteLength(JSON.stringify(large))).toBeLessThan(
    pluginPageBytes,
  );

  expect(checkedTree(json(large), 'page')).toEqual({
    ok: false,
    error: `prepared page exceeds ${pluginPageBytes} bytes`,
  });
});

it('turns an invalid container into Update Argo', () => {
  const broken = { ...stack([leaf('label', {})]), props: { direction: 'x' } };

  expect(checkedTree(json(broken), 'page')).toMatchObject({
    ok: true,
    root: { type: 'Text', props: { children: 'Update Argo to see this' } },
  });
});

const unsafe = svg('<svg><script/></svg>', 'unsafe');

const circle = '<svg><circle cx="2" cy="3" r="1" fill="currentColor"/></svg>';

it('drops refused SVG from a page, says which, and sends canonical markup', () => {
  expect(
    checkedTree(json(stack([svg(circle, 'valid'), unsafe])), 'page'),
  ).toMatchObject({
    ok: true,
    root: {
      children: [
        {
          key: 'valid',
          props: {
            xml: '<svg><circle cx="2" cy="3" fill="currentColor" r="1"/></svg>',
          },
        },
      ],
    },
    refused: [
      { node: 'Stack#root/Svg#unsafe', reason: 'element <script> refused' },
    ],
  });
});

it("drops refused SVG from a component's own slot without refusing the page", () => {
  const root = {
    ...stack([]),
    slots: { leading: [svg('<svg><path d="M0 0"/></svg>', 'valid'), unsafe] },
  };

  expect(checkedTree(json(root), 'page')).toMatchObject({
    ok: true,
    refused: [{ node: 'Stack#root/Svg#unsafe' }],
  });
});
