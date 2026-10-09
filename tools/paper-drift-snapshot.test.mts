import { expect, it } from 'vitest';
import type { PaperPort } from './paper-drift/paper-port.mts';
import { layerAt } from './paper-drift/snapshot-model.mts';
import { takeSnapshot } from './paper-drift/snapshot.mts';
import { parseTreeSummary } from './paper-drift/tree-summary.mts';

const summary = [
  'Frame "Board" (1-0) 100x100',
  '  Frame "Row" (2-0) 100x20 [hidden]',
  '    Text "Label" (3-0) 40x20 "two',
  'lines"',
  '  Frame "Deep" (4-0) 100x20',
  '    ... 1 children',
].join('\n');

it('parses layers, hidden flags, multi-line text and cuts', (): void => {
  const { rows, unrecognised } = parseTreeSummary(summary);
  expect(unrecognised).toEqual([]);
  expect(rows).toEqual([
    {
      kind: 'layer',
      depth: 0,
      id: '1-0',
      type: 'Frame',
      name: 'Board',
      hidden: false,
    },
    {
      kind: 'layer',
      depth: 1,
      id: '2-0',
      type: 'Frame',
      name: 'Row',
      hidden: true,
    },
    {
      kind: 'layer',
      depth: 2,
      id: '3-0',
      type: 'Text',
      name: 'Label',
      hidden: false,
      text: 'two\nlines',
    },
    {
      kind: 'layer',
      depth: 1,
      id: '4-0',
      type: 'Frame',
      name: 'Deep',
      hidden: false,
    },
    { kind: 'cut', depth: 2 },
  ]);
});

const answers: Record<string, (args: Record<string, unknown>) => unknown> = {
  get_basic_info: (args): unknown =>
    args['pageId'] === undefined
      ? { pages: [{ id: 'p', name: 'Page' }], artboards: [] }
      : { pages: [], artboards: [{ id: '1-0', name: 'Board' }] },
  get_tree_summary: (args): unknown =>
    args['nodeId'] === '1-0'
      ? { summary }
      : { summary: 'Frame "Leaf" (5-0) 10x10' },
  get_children: (): unknown => ({ children: [{ id: '5-0', name: 'Leaf' }] }),
  get_computed_styles: (): unknown => ({
    styles: { '2-0': { display: 'none' } },
  }),
  get_tokens: (): unknown => ({ tokens: [{ name: '--a', value: '1px' }] }),
  get_jsx: (): unknown => '<div />',
};

const paper: PaperPort = {
  call: (tool, args): Promise<unknown> =>
    Promise.resolve(answers[tool]?.(args)),
  close: (): Promise<void> => Promise.resolve(),
};

it('indexes every artboard and walks the children a summary cut off', async (): Promise<void> => {
  const snapshot = await takeSnapshot({
    paper,
    fileId: 'file',
    report: (): void => {},
  });
  expect(layerAt(snapshot, '4-0').children).toEqual(['5-0']);
  expect(layerAt(snapshot, '5-0').parent).toBe('4-0');
  expect(layerAt(snapshot, '3-0').text).toBe('two\nlines');
  expect(snapshot.artboards).toEqual([
    { id: '1-0', name: 'Board', page: 'Page', kind: 'screens' },
  ]);
  expect(snapshot.tokens).toEqual({ '--a': '1px' });
});
