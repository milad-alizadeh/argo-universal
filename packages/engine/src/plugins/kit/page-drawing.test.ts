import { expect, it } from 'vitest';
import { stopper } from './live-loads';
import { drawing, type DrawEvent } from './page-drawing';
import { jsx } from './jsx-runtime';

const event: DrawEvent = {
  type: 'draw',
  id: 0,
  path: '/',
  pageState: {},
  pages: 1,
};

const reading = {
  call: () => Promise.reject(new Error('no read expected')),
  lists: new Map(),
};

it('hands the Render no way to read, as it is pure', async () => {
  let inputKeys: string[] = [];

  const page = drawing({
    load: () => 'loaded',
    render: (_data, _to, input) => {
      inputKeys = Object.keys(input);

      return jsx('Stack', {});
    },
  });

  await page.draw({ params: {}, event, reading, stop: stopper() });

  expect(inputKeys).not.toContain('read');
  expect(inputKeys).toEqual(
    expect.arrayContaining(['params', 'state', 'context', 'list']),
  );
});
