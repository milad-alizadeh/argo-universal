import { expect, it } from 'vitest';
import {
  chipCopy,
  chipMaster,
  chipRegistry,
  componentBoard,
  screen,
  snapshotOf,
} from './paper-drift.mocks.mts';
import { paperEditContext } from './paper-drift/edit-hook.mts';
import { editWarnings, type PaperEdit } from './paper-drift/edit-warning.mts';

const snapshot = snapshotOf([
  componentBoard(chipMaster()),
  screen(chipCopy('a'), chipCopy('b')),
]);

function styleEdit(nodeId: string, ...styles: string[]): PaperEdit {
  return { tool: 'update_styles', targets: [{ nodeId, styles }] };
}

function warningsOf(edit: PaperEdit): string[] {
  return editWarnings(snapshot, chipRegistry, edit);
}

it('warns that an edit inside a master may leave its copies drifting', (): void => {
  const [warning] = warningsOf(styleEdit('label', 'fontSize'));
  expect(warning).toContain('master "Chip"; its 2 copies may now drift');
});

it('warns about a style edit on a copy', (): void => {
  const [warning] = warningsOf(styleEdit('a-label', 'fontSize'));
  expect(warning).toContain('a copy of "Chip"');
});

it('lets a copy change its text, hide a layer and place its root', (): void => {
  const text = {
    tool: 'set_text_content',
    targets: [{ nodeId: 'a-label', styles: [] }],
  };
  expect(warningsOf(text)).toEqual([]);
  expect(warningsOf(styleEdit('a-label', 'display'))).toEqual([]);
  expect(warningsOf(styleEdit('a', 'width', 'flexShrink'))).toEqual([]);
});

it('warns when a copy places a layer below its root', (): void => {
  expect(warningsOf(styleEdit('a-label', 'width'))).toHaveLength(1);
});

it('says nothing about layers outside any master', (): void => {
  expect(warningsOf(styleEdit('screen', 'gap'))).toEqual([]);
});

it('reports Paper tool input it does not recognise', (): void => {
  const context = paperEditContext({
    tool_name: 'mcp__paper__update_styles',
    tool_input: { updates: [{ nodeIds: ['a'], styles: {}, extra: true }] },
  });
  expect(context).toBe(
    'Paper drift check skipped: unrecognised update_styles input (1 issues).',
  );
});

it('reads the page and target ids agents pass to Paper writes', (): void => {
  const context = paperEditContext({
    tool_name: 'mcp__paper__update_styles',
    tool_input: {
      fileId: 'f',
      pageId: 'p',
      updates: [{ nodeIds: ['a'], styles: { left: 0 } }],
    },
  });
  expect(context ?? '').not.toContain('skipped');
});

it('ignores Paper tools that only read', (): void => {
  const context = paperEditContext({
    tool_name: 'mcp__paper__get_screenshot',
    tool_input: { nodeId: 'a' },
  });
  expect(context).toBeUndefined();
});
