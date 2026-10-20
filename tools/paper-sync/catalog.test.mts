import { expect, it } from 'vitest';
import { discover } from './catalog.mts';
import type { PageIndex } from './index-model.mts';
import { unenrolled } from './report-data.mts';
import { parseSummary } from './summary.mts';

const button = 'Button / Default';

function page(fileId: string, family: string, card = family): PageIndex {
  const nodes = [
    {
      id: 'card',
      name: `Components / ${card}`,
      component: 'Frame',
      parentId: null,
    },
    {
      id: 'master',
      name: `${family} / Default`,
      component: 'Frame',
      parentId: 'card',
    },
    {
      id: 'inner',
      name: button,
      component: 'Frame',
      parentId: 'master',
    },
  ];

  return {
    fileId,
    pageId: 'p',
    pageName: 'Components',
    nodes,
    scannedAt: '',
    seconds: 1,
    calls: 1,
    revision: null,
  };
}

it('discovers families across files without promoting nested copies to masters', () => {
  const catalog = discover([page('one', 'Button'), page('two', 'ListItem')]);
  expect(catalog.masters.map((node) => node.name)).toEqual([
    button,
    'ListItem / Default',
  ]);
  expect(catalog.duplicates).toEqual([]);
});

it('lists unlinked copies only for families that have masters', () => {
  const issues = page('two', 'Issue', 'Issues list');
  const empty = { id: 'empty', name: 'Components / Issue row' };
  issues.nodes.push({ ...empty, component: 'Frame', parentId: null });
  const catalog = discover([page('one', 'Button'), issues]);

  const registry = { version: 1 as const, families: [] };
  const list = unenrolled(catalog, { registry, excluded: [], rebindings: [] });

  expect(list.map((node) => [node.fileId, node.name])).toEqual([
    ['one', button],
    ['two', button],
  ]);
});

it('reports duplicate names across files without choosing a master', () => {
  const catalog = discover([page('one', 'Button'), page('two', 'Button')]);
  expect(catalog.masters).toEqual([]);
  expect(catalog.duplicates[0]?.map((node) => node.fileId)).toEqual([
    'one',
    'two',
  ]);
});

it('parses page roots and does not expand SVG artwork', () => {
  const result = parseSummary(
    ' "" (root) ?×?\n  Frame "Components / Button" (card)\n    ... 2 children\n  SVG "Icon" (svg)\n    ... 4 children',
  );

  expect(result.nodes[1]?.parentId).toBe('root');
  expect(result.expand).toEqual(['card']);
});
