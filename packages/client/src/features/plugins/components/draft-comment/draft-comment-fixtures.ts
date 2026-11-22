import type { WireNode } from '@repo/contracts/plugins/wire';
import type { DraftNote } from '../../stores/draft-comments';
import type { DraftRegionTag } from '../../utils/draft-regions-model';

export const issuesPage = { pluginId: 'tracker', path: '/issues' };

export const regionTags: DraftRegionTag[] = [
  {
    id: 'header',
    label: 'Header',
    variant: 'compact',
    letter: 'A',
    position: 1,
    count: 2,
  },
  {
    id: 'list',
    label: 'List',
    variant: 'rows',
    letter: 'A',
    position: 1,
    count: 2,
  },
];

const node = (
  type: string,
  key: string,
  props: WireNode['props'] = {},
): WireNode => ({ type, key, props, children: [], slots: {} });

const row = (key: string, title: string, subtitle: string): WireNode => ({
  ...node('ListItem', key, {
    title,
    subtitle,
    onPress: { pageState: { open: key } },
  }),
});

export const issuesTree: WireNode = {
  ...node('Stack', 'page', { direction: 'column', gap: 'space3' }),
  children: [
    node('Text', 'title', { children: 'Issues', role: 'title' }),
    {
      ...node('Stack', 'header', { direction: 'column' }),
      children: [node('Text', 'count', { children: 'ARGO · 24 open' })],
    },
    {
      ...node('List', 'list', { appearance: 'cards' }),
      children: [
        {
          ...node('List.Section', 'open', { title: 'Open' }),
          children: [
            row('row-409', 'Pairing code expires', 'ARGO-409'),
            row('row-401', 'Composer drops a draft', 'ARGO-401'),
          ],
        },
      ],
    },
  ],
};

export const leftNotes: DraftNote[] = [
  { address: 'page/title', nodeKey: 'title', note: 'Make the title larger' },
  {
    address: 'page/list/open/row-401',
    nodeKey: 'row-401',
    region: 'list',
    variant: 'rows',
    note: 'Show who it is assigned to',
  },
];

export const fieldRowTree: WireNode = {
  ...node('Stack', 'page', { direction: 'row', gap: 'space3' }),
  children: [
    node('Text', 'label', { children: 'Name' }),
    node('TextArea', 'name', { label: 'Name', value: '' }),
  ],
};

export const longListTree: WireNode = {
  ...node('Screen', 'page', { title: 'Issues' }),
  children: [
    {
      ...node('List', 'list', { appearance: 'cards' }),
      children: [
        {
          ...node('List.Section', 'open', { title: 'Open' }),
          children: Array.from({ length: 30 }, (_, index) =>
            row(`row-${index}`, `Issue ${index}`, `ARGO-${index}`),
          ),
        },
      ],
    },
  ],
};

export const tableTree: WireNode = {
  ...node('Table', 'issues', { columns: [{ id: 'title', title: 'Issue' }] }),
  children: [
    {
      ...node('Table.Row', 'first-issue', { id: 'first' }),
      children: [
        node('Table.Cell', 'issue-title', {
          column: 'title',
          text: 'First issue',
        }),
      ],
    },
  ],
};

export const exactTargetTree: WireNode = {
  ...node('Screen', 'exact-targets', { title: 'Exact targets' }),
  slots: {
    actions: [
      node('Action', 'copy-link', {
        label: 'Copy link',
        icon: 'copy',
        onPress: { pageState: { copied: true } },
      }),
      node('Action', 'share-link', {
        label: 'Share link',
        onPress: { pageState: { shared: true } },
      }),
    ],
  },
  children: [
    {
      ...node('Canvas', 'canvas', {
        label: 'Draft diagram',
        width: 800,
        height: 150,
        camera: 'fixed',
      }),
      children: [
        node('Canvas.Rect', 'diagram-shape', {
          x: 0,
          y: 0,
          width: 800,
          height: 150,
          tone: 'muted',
          fill: true,
        }),
        node('Canvas.Circle', 'diagram-circle', {
          cx: 200,
          cy: 70,
          r: 40,
          tone: 'accent',
          fill: true,
        }),
      ],
    },
  ],
};

export const boardTree: WireNode = {
  ...node('Board', 'issue-board', { accessibilityLabel: 'Issue board' }),
  children: [
    {
      ...node('Board.Column', 'open-column', {
        id: 'open',
        title: 'Open lane',
      }),
      children: [
        node('Board.Card', 'first-card', {
          id: 'first-card',
          title: 'First card',
        }),
      ],
    },
  ],
};

export const sheetTree: WireNode = {
  ...node('Sheet', 'details-sheet', { open: true, label: 'Issue details' }),
  children: [
    {
      ...node('Sheet.Screen', 'issue-details', {
        name: 'details',
        title: 'Issue details',
      }),
      children: [node('Text', 'issue-summary', { children: 'Issue summary' })],
    },
  ],
};
