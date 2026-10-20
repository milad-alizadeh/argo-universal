import { expect, it } from 'vitest';
import { discover } from './catalog.mts';
import {
  includedFiles,
  includedIndices,
  includedPages,
  includedRegistry,
  skippedLine,
  type ExcludedArea,
} from './excluded-areas.mts';
import type { IndexedNode, PageIndex } from './index-model.mts';
import type { Binding, Registry } from './model.mts';

const files = [
  { name: 'Foundations', id: 'foundations' },
  { name: 'Atlas', id: 'atlas' },
  { name: 'Sessions', id: 'sessions' },
];

const area = { file: 'Sessions', fileId: 'sessions', reason: 'WIP' };

const atlas: ExcludedArea = { file: 'Atlas', fileId: 'atlas', reason: 'WIP' };

const drafts = { ...area, page: { name: 'Drafts', id: 'drafts' } };

const sketch = { ...area, board: { name: 'Sketch', id: 'sketch' } };

const masterName = 'Button / Default';

function frame(id: string, parentId: string | null, name = id): IndexedNode {
  return { id, name, component: 'Frame', parentId };
}

function page(fileId: string, pageId: string, nodes: IndexedNode[]): PageIndex {
  const scan = { scannedAt: '', seconds: 0, calls: 0, revision: null };

  return { fileId, pageId, pageName: pageId, nodes, ...scan };
}

function card(fileId: string, pageId: string): PageIndex {
  return page(fileId, pageId, [
    frame(`${pageId}-card`, null, 'Components / Button'),
    frame(`${pageId}-master`, `${pageId}-card`, masterName),
  ]);
}

function binding(fileId: string, nodeId: string): Binding {
  const slots = { nodes: {}, textOverrides: {}, lastText: {}, layout: {} };

  return { fileId, nodeId, name: masterName, ...slots };
}

function registry(masterFile: string, copies: Binding[]): Registry {
  const master = { fileId: masterFile, nodeId: 'm' };

  return { version: 1, families: [{ name: masterName, master, copies }] };
}

it.each([
  [
    'a full run leaves excluded files out',
    undefined,
    ['Foundations', 'Sessions'],
  ],
  ['a file with only a page or board excluded stays', 'sessions', ['Sessions']],
])('selects files: %s', (_, fileId, names) => {
  const selected = includedFiles(files, [atlas, drafts, sketch], fileId);

  expect(selected.map((file) => file.name)).toEqual(names);
});

it.each([
  ['atlas', /Atlas is excluded from paper-sync \(WIP\)/],
  ['nope', /Not a canonical file: nope/],
])('rejects --file=%s', (fileId, message) => {
  expect(() => includedFiles(files, [atlas], fileId)).toThrow(message);
});

it('skips excluded pages of the file being scanned only', () => {
  const pages = [{ id: 'drafts' }, { id: 'flows' }];

  expect(includedPages('sessions', pages, [drafts])).toEqual([{ id: 'flows' }]);
  expect(includedPages('foundations', pages, [drafts])).toEqual(pages);
});

it('drops excluded files and pages from saved scans', () => {
  const pages = [
    card('atlas', 'p1'),
    card('sessions', 'drafts'),
    card('sessions', 'flows'),
  ];

  const kept = includedIndices(pages, [atlas, drafts]);

  expect(kept.map((item) => `${item.fileId}/${item.pageId}`)).toEqual([
    'sessions/flows',
  ]);
});

it('drops an excluded board and everything inside it', () => {
  const nodes = [
    frame('flow', null),
    frame('sketch', null),
    frame('inner', 'sketch'),
    frame('deep', 'inner'),
    frame('kept', 'flow'),
  ];

  const [kept] = includedIndices([page('sessions', 'flows', nodes)], [sketch]);

  expect(kept?.nodes.map((node) => node.id)).toEqual(['flow', 'kept']);
});

it('does not count a master inside an excluded area', () => {
  const pages = [card('atlas', 'p1'), card('sessions', 'flows')];
  const masters = discover(includedIndices(pages, [atlas])).masters;

  expect(discover(pages).masters).toEqual([]);
  expect(masters.map((node) => `${node.fileId}/${node.id}`)).toEqual([
    'sessions/flows-master',
  ]);
});

it('drops registry copies and masters in excluded files', () => {
  const copies = [binding('atlas', 'c1'), binding('sessions', 'c2')];
  const kept = includedRegistry(registry('foundations', copies), [atlas], []);

  expect(kept.families[0]?.copies).toEqual([binding('sessions', 'c2')]);
  expect(includedRegistry(registry('atlas', []), [atlas], []).families).toEqual(
    [],
  );
});

it('keeps only scanned registry entries in a file with an excluded page or board', () => {
  const copies = [binding('sessions', 'on-draft'), binding('sessions', 'kept')];
  const scanned = [{ fileId: 'sessions', id: 'kept' }];

  const kept = includedRegistry(
    registry('foundations', copies),
    [drafts],
    scanned,
  );

  expect(kept.families[0]?.copies).toEqual([binding('sessions', 'kept')]);
});

it('reports every skipped area on one line', () => {
  expect(
    skippedLine([atlas, drafts, { ...sketch, reason: 'Exploration' }]),
  ).toBe(
    'Skipped: Atlas (WIP), Sessions / Drafts (WIP), Sessions / Sketch (Exploration)',
  );
  expect(skippedLine([])).toBeUndefined();
});
