import { useState, useLayoutEffect, Fragment } from '@argo/plugin-kit';
import { jsx } from '@argo/plugin-kit/jsx-runtime';

const row = (id) => jsx('Text', { children: id }, id);

const largeRow = (_, i) =>
  jsx('Text', { children: 'x'.repeat(700000) }, String(i));

function GrowPage() {
  const [count, setCount] = useState(0);

  return jsx('Stack', {
    direction: 'column',
    children: [
      jsx(
        'Button',
        { label: 'Grow', onPress: () => setCount((n) => n + 1) },
        'grow',
      ),
      ...Array.from({ length: count }, largeRow),
    ],
  });
}

function CoalescedPage() {
  const [count, setCount] = useState(0);

  useLayoutEffect(() => {
    if (count < 3) setCount(count + 1);
  }, [count]);

  return jsx('Text', { children: `Commit ${count}` });
}

function trailing(count, setCount) {
  if (count === 2) return [];

  return [
    jsx(
      'Button',
      { label: 'Increment', onPress: () => setCount((n) => n + 1) },
      'button',
    ),
    jsx('Text', { children: `Count ${count}` }, 'count'),
  ];
}

function SlottedPage({ initial = 0 }) {
  const [count, setCount] = useState(initial);

  return jsx('ListItem', {
    title: 'Slotted row',
    leading:
      count === 2
        ? []
        : jsx(Fragment, { children: [row('First'), row('Second')] }),
    trailing: trailing(count, setCount),
  });
}

const prepend = (rows) => ['new', ...rows];

const moveFirst = (rows) => [...rows.slice(1), rows[0]];

function listActions(setItems) {
  return [
    jsx(
      'Button',
      { label: 'Prepend', onPress: () => setItems(prepend) },
      'prepend',
    ),
    jsx(
      'Button',
      { label: 'Move first', onPress: () => setItems(moveFirst) },
      'move',
    ),
  ];
}

function ListPage() {
  const [items, setItems] = useState(() =>
    Array.from({ length: 2000 }, (_, i) => String(i)),
  );

  return jsx('Stack', {
    direction: 'column',
    children: [
      ...listActions(setItems),
      jsx('List', { items, renderItem: row }, 'list'),
    ],
  });
}

const CustomRow = ({ id }) => row(id);

const pages = {
  '/indexed': () =>
    jsx('List', {
      items: ['row'],
      renderItem: (id, index) =>
        jsx('Text', { children: `${index}:${id}` }, id),
    }),
  '/custom': () =>
    jsx('List', {
      items: ['row'],
      renderItem: (id) => jsx(CustomRow, { id }, id),
    }),
  '/fragment': () =>
    jsx('List', {
      items: ['row'],
      renderItem: (id) => jsx(Fragment, { children: row(id) }, id),
    }),
  '/': ListPage,
  '/oversize': () => jsx('Text', { children: '🚀'.repeat(300000) }),
  '/grow': GrowPage,
  '/coalesce': CoalescedPage,
  '/slots': SlottedPage,
  '/slots-empty': () => jsx(SlottedPage, { initial: 1 }),
  '/missing': () =>
    jsx('List', {
      items: ['row'],
      renderItem: (id) => jsx('Text', { children: id }),
    }),
  '/duplicate': () => jsx('List', { items: ['row', 'row'], renderItem: row }),
};

export function register(argo) {
  for (const [path, page] of Object.entries(pages))
    argo.pages.register(path, page);
}
