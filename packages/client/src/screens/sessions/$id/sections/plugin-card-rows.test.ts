import type { WireNode } from '@repo/contracts/plugins/wire';
import { emptyPage } from '@repo/contracts/plugins/wire-empty-page';
import { describe, expect, it } from 'vitest';
import { pluginCardLines } from './plugin-card-rows';

const node = (
  type: string,
  props: WireNode['props'] = {},
  children: WireNode[] = [],
): WireNode => ({ type, key: type, props, children, slots: {} });

describe('pluginCardLines', () => {
  it('reads nothing before the page answers, or from a page that draws nothing', () => {
    expect(pluginCardLines(null)).toEqual([]);
    expect(pluginCardLines(emptyPage())).toEqual([]);
  });

  it('reads each row in order, with its value or else its supporting line', () => {
    const root = node('List', { appearance: 'grouped' }, [
      node('List.Section', { title: 'Issue' }, [
        node('FieldGroup.Link', { title: '#32344', value: 'Open' }),
        node('ListItem', { title: 'Fix login', subtitle: 'In review' }),
      ]),
      node('Stack', {}, [node('FieldGroup.Value', { title: 'Owner' })]),
    ]);

    expect(pluginCardLines(root)).toEqual([
      { title: '#32344', value: 'Open' },
      { title: 'Fix login', value: 'In review' },
      { title: 'Owner' },
    ]);
  });

  it('reads rows inside slots and not the content of a row', () => {
    const root = {
      ...node('Card'),
      slots: {
        footer: [
          node('ListItem', { title: 'Sprint 12' }, [
            node('Text', { children: 'Inside the row' }),
          ]),
        ],
      },
    };

    expect(pluginCardLines(root)).toEqual([{ title: 'Sprint 12' }]);
  });

  it('reads each Text when the page draws no rows', () => {
    const root = node('Stack', {}, [
      node('Text', { children: '#412 · In review' }),
      node('Text', { children: '  ' }),
      node('Text', { children: 'Assigned to you' }),
    ]);

    expect(pluginCardLines(root)).toEqual([
      { title: '#412 · In review' },
      { title: 'Assigned to you' },
    ]);
  });

  it('skips a row with no title', () => {
    const root = node('List', {}, [node('ListItem', { title: ' ' })]);

    expect(pluginCardLines(root)).toEqual([]);
  });
});
