import type { WireNode } from '@repo/contracts/plugins/wire';
import type { DraftRegionTag } from '../../utils/draft-regions-model';

export const issuesPage = { pluginId: 'tracker', path: '/issues' };

// The page's two regions, each on the Variant its tag shows.
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

const row = (key: string, title: string, subtitle: string): WireNode =>
  node('ListItem', key, { title, subtitle });

// An Issues page of a dev Plugin: a header region over a list region, with a title outside both.
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
