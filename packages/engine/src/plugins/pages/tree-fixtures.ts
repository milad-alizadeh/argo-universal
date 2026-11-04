import type { WireNode } from '@repo/contracts/plugins/wire';

export const leaf = (key: string, props: WireNode['props']): WireNode => ({
  type: 'Text',
  key,
  props,
  children: [],
  slots: {},
});

export const stack = (children: WireNode[]): WireNode => ({
  ...leaf('root', { direction: 'column' }),
  type: 'Stack',
  children,
});

export const svg = (xml: string, key: string): WireNode => ({
  ...leaf(key, { xml, label: key }),
  type: 'Svg',
});
