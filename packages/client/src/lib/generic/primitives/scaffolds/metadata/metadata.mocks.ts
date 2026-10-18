import type { MetadataProps } from './metadata-props';

export const fields: MetadataProps['rows'] = [
  { title: 'Branch', value: { kind: 'text', text: 'main' } },
  {
    title: 'Device',
    value: { kind: 'text', text: 'Milad’s MacBook Pro', icon: 'computer' },
  },
  {
    title: 'Path',
    value: { kind: 'text', text: '~/Developer/argo-universal' },
  },
  {
    title: 'Labels',
    value: {
      kind: 'pills',
      pills: [
        { text: 'bug', tone: 'neutral' },
        { text: 'area/sync', tone: 'neutral' },
        { text: 'good first issue', tone: 'neutral' },
        { text: 'desktop', tone: 'neutral' },
        { text: 'needs-review', tone: 'neutral' },
        { text: 'p2', tone: 'neutral' },
      ],
    },
  },
  {
    title: 'Platforms',
    value: {
      kind: 'pills',
      pills: [{ text: 'iOS' }, { text: 'Android' }, { text: 'Web' }],
    },
  },
  {
    title: 'Status',
    value: { kind: 'status', text: 'In progress', tone: 'info' },
  },
  {
    title: 'Checks',
    value: { kind: 'status', text: 'Passed', tone: 'success' },
  },
];
