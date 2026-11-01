import { expect, it } from 'vitest';
import { drawn, map, stack, svg, type Drawn } from './draw-tree-fixtures';

const unsafe = svg('<svg><script/></svg>', 'unsafe');

const refusedLine =
  'Plugin atlas: refused /map node Stack#root/Svg#unsafe: element <script> refused';

const circle = '<svg><circle cx="2" cy="3" r="1" fill="currentColor"/></svg>';

const drawnPage = (): Drawn =>
  drawn(
    [
      {
        type: 'snapshot',
        revision: 1,
        root: stack([svg(circle, 'valid'), unsafe]),
      },
    ],
    map,
  );

it('drops refused SVG nodes from an ordinary page', () => {
  const { sent, logs } = drawnPage();

  expect(sent).toMatchObject([
    { type: 'snapshot', root: { children: [{ key: 'valid' }] } },
  ]);
  expect(logs).toEqual([refusedLine]);
});

it('sends canonical SVG markup', () => {
  expect(drawnPage().sent).toMatchObject([
    {
      root: {
        children: [
          {
            props: {
              xml: '<svg><circle cx="2" cy="3" fill="currentColor" r="1"/></svg>',
            },
          },
        ],
      },
    },
  ]);
});

it("drops refused SVG nodes from a component's own slot without refusing the view", () => {
  const root = {
    ...stack([]),
    slots: { leading: [svg('<svg><path d="M0 0"/></svg>', 'valid'), unsafe] },
  };

  const { view, sent, logs } = drawn(
    [{ type: 'snapshot', revision: 1, root }],
    map,
  );

  expect(view.refused).toBe(false);
  expect(sent.map(({ type }) => type)).toEqual(['snapshot']);
  expect(logs).toEqual([refusedLine]);
});
