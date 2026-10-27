import type { ViewMessage, WireNode } from '@repo/contracts/plugins/wire';
import { drawTree } from './draw-tree';
import { createOpenView, type OpenView, type Opening } from './open-view';

export type Drawn = { view: OpenView; sent: ViewMessage[]; logs: string[] };

export function drawn(messages: ViewMessage[], opening: Opening): Drawn {
  const view = createOpenView('atlas', opening, 'connection');
  const sent: ViewMessage[] = [];
  const logs: string[] = [];
  view.events.on('message', (message) => sent.push(message));

  for (const [index, message] of messages.entries())
    drawTree(view, message, {
      log: (line) => logs.push(line),
      revision: index + 1,
    });

  return { view, sent, logs };
}

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

export const map = { path: '/map' };
