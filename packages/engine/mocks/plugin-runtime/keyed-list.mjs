import { Fragment } from '@argo/plugin-kit';
import { jsx } from '@argo/plugin-kit/jsx-runtime';

const row = (id) => jsx('Text', { children: id }, id);

// A live Loader yields its first value, then its second once that frame has gone out, then holds.
const later = () => new Promise((resolve) => setTimeout(resolve, 100));

function live(first, second, render) {
  return {
    load: async function* () {
      yield first;
      await later();
      yield second;
      await new Promise(() => {});
    },
    render,
  };
}

const drawn = (render) => ({ load: () => null, render });

function trailing(count) {
  if (count === 2) return [];

  return [
    jsx('Button', { label: 'Increment' }, 'button'),
    jsx('Text', { children: `Count ${count}` }, 'count'),
  ];
}

const slotted = (count) =>
  jsx('ListItem', {
    title: 'Slotted row',
    leading:
      count === 2
        ? []
        : jsx(Fragment, { children: [row('First'), row('Second')] }),
    trailing: trailing(count),
  });

const rows = Array.from({ length: 2000 }, (_, i) => String(i));

const list = (items) =>
  jsx('Stack', {
    direction: 'column',
    children: [jsx('List', { items, renderItem: row }, 'list')],
  });

const CustomRow = ({ id }) => row(id);

const pages = {
  '/prepend': live(rows, ['new', ...rows], list),
  '/move': live(rows, [...rows.slice(1), rows[0]], list),
  '/indexed': drawn(() =>
    jsx('List', {
      items: ['row'],
      renderItem: (id, index) =>
        jsx('Text', { children: `${index}:${id}` }, id),
    }),
  ),
  '/custom': drawn(() =>
    jsx('List', {
      items: ['row'],
      renderItem: (id) => jsx(CustomRow, { id }, id),
    }),
  ),
  '/fragment': drawn(() =>
    jsx('List', {
      items: ['row'],
      renderItem: (id) => jsx(Fragment, { children: row(id) }, id),
    }),
  ),
  '/oversize': drawn(() => jsx('Text', { children: '🚀'.repeat(300000) })),
  '/slots': live(0, 1, slotted),
  '/slots-empty': live(1, 2, slotted),
  '/missing': drawn(() =>
    jsx('List', {
      items: ['row'],
      renderItem: (id) => jsx('Text', { children: id }),
    }),
  ),
  '/duplicate': drawn(() =>
    jsx('List', { items: ['row', 'row'], renderItem: row }),
  ),
};

export function register(argo) {
  for (const [path, page] of Object.entries(pages))
    argo.pages.define(path, page);
}
