import type { WireNode } from '@repo/contracts/plugins/wire';
import { iconSymbols } from '@repo/kit/symbols/icon-names';
import { describe, expect, it } from 'vitest';
import { pluginSectionId } from '../../lib/product/navigation/sections';
import { segmentsOf } from './plugin-page-route';
import {
  landingOf,
  landingRoute,
  listOnly,
  withSelectedRow,
} from './plugin-section-tree';
import type { PluginSection } from './use-plugin-sections';

const openPage = '/filters/open';

const closedPage = '/filters/closed';

const row = (key: string, path: string): WireNode => ({
  type: 'ListItem',
  key,
  props: { title: key, onPress: { action: 'navigate', path } },
  children: [],
  slots: {},
});

const list: WireNode = {
  type: 'List',
  key: 'rows',
  props: {},
  children: [
    {
      type: 'List.Section',
      key: 'status',
      props: { title: 'Status' },
      children: [row('open', openPage), row('closed', closedPage)],
      slots: {},
    },
  ],
  slots: {},
};

const empty: WireNode = {
  type: 'EmptyState',
  key: 'none',
  props: { title: 'Nothing' },
  children: [],
  slots: {},
};

const root: WireNode = {
  type: 'ListDetail',
  key: 'issues',
  props: { landing: openPage },
  children: [],
  slots: { list: [list], empty: [empty] },
};

const rowsIn = (nodes: readonly WireNode[]): WireNode[] =>
  nodes.flatMap((node) =>
    node.type === 'ListItem' ? [node] : rowsIn(node.children),
  );

const selectedRows = (tree: WireNode): string[] =>
  rowsIn(tree.slots.list ?? [])
    .filter((node) => node.props.selected === true)
    .map((node) => node.key);

describe('a section list’s selected row', () => {
  it('is the row that links to the shown page', () => {
    expect(selectedRows(withSelectedRow(root, [closedPage]))).toEqual([
      'closed',
    ]);
  });

  it('stays on the row a page was pushed from', () => {
    expect(
      selectedRows(withSelectedRow(root, ['/issues/42', openPage])),
    ).toEqual(['open']);
  });

  it('is no row for a page no row links to', () => {
    expect(selectedRows(withSelectedRow(root, ['/issues/42']))).toEqual([]);
  });
});

describe('a section root', () => {
  it('names the page it lands on', () => {
    expect(landingOf(root)).toBe(openPage);
  });

  it('has no landing when it is not a ListDetail', () => {
    expect(landingOf({ ...root, type: 'Screen' })).toBeUndefined();
  });

  it('keeps only its list for the live view', () => {
    expect(Object.keys(listOnly(root).slots)).toEqual(['list']);
  });
});

const nav = (navId: string, path: string): PluginSection => ({
  id: pluginSectionId('tracker', navId),
  pluginId: 'tracker',
  name: 'tracker',
  title: navId,
  icon: iconSymbols.plug,
  navId,
  navPath: segmentsOf(path),
  rootPath: `/plugins/tracker/${navId}`,
});

const issues = nav('issues', '/issues');

const sections = [issues, nav('boards', '/boards')];

describe('a section landing', () => {
  it('opens a page of its own nav item', () => {
    expect(landingRoute(sections, issues, '/issues/open')).toEqual([
      'tracker',
      'issues',
      'issues',
      'open',
    ]);
  });

  it.each(['/issues', '/issues/', '', '/'])(
    'lands nowhere when %j names its root, which is where it already is',
    (landing) => {
      expect(landingRoute(sections, issues, landing)).toBeUndefined();
    },
  );

  it('lands nowhere on another nav item’s page, which has its own stack', () => {
    expect(landingRoute(sections, issues, '/boards/1')).toBeUndefined();
  });
});
