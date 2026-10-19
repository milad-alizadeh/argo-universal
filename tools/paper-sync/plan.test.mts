import { describe, expect, it } from 'vitest';
import { enroll } from './bind.mts';
import type { DesignNode, Snapshot } from './model.mts';
import { hasChanges, planSync } from './plan.mts';
import { svgFromJsx } from './svg.mts';
import { checkTokens } from './tokens.mts';

function node(
  id: string,
  parentId: string | null,
  childIds: string[] = [],
  text: string | null = null,
): DesignNode {
  return {
    id,
    parentId,
    childIds,
    name: text === null ? id : 'Label',
    component: text === null ? 'Frame' : 'Text',
    textContent: text,
    isVisible: true,
    isLocked: false,
    styles: {},
    svg: null,
  };
}
function pair(label = 'Publish'): { master: Snapshot; copy: Snapshot } {
  return {
    master: {
      fileId: 'source',
      rootId: 'button',
      nodes: [
        node('button', null, ['label']),
        node('label', 'button', [], 'Save'),
      ],
    },
    copy: {
      fileId: 'destination',
      rootId: 'copy',
      nodes: [node('copy', null, ['text']), node('text', 'copy', [], label)],
    },
  };
}

describe('Paper component sync', () => {
  it('moves an overridden label into a new master wrapper without replacing its node', () => {
    const { master, copy } = pair();
    const binding = enroll(master, copy);
    master.nodes = [
      node('button', null, ['wrap']),
      node('wrap', 'button', ['label']),
      node('label', 'wrap', [], 'Save now'),
    ];
    const plan = planSync(master, copy, binding);
    expect(plan.creates.map((creation) => creation.sourceId)).toEqual(['wrap']);
    expect(plan.moves).toContainEqual({
      sourceId: 'label',
      parentSourceId: 'wrap',
      index: 0,
    });
    expect(plan.binding.nodes.label).toBe('text');
    expect(plan.binding.lastText.label).toBe('Publish');
    expect(plan.removes).toEqual([]);
    expect(plan.texts).toEqual([]);
  });
  it('removes obsolete structure while rescuing the text node', () => {
    const { master, copy } = pair();
    copy.nodes = [
      node('copy', null, ['old']),
      node('old', 'copy', ['text']),
      node('text', 'old', [], 'Publish'),
    ];
    const plan = planSync(master, copy, enroll(master, copy));
    expect(plan.removes).toEqual(['old']);
    expect(plan.moves).toEqual([
      { sourceId: 'label', parentSourceId: 'button', index: 0 },
    ]);
  });
  it('recognizes a label edited after enrollment as a new override', () => {
    const { master, copy } = pair('Save');
    const binding = enroll(master, copy);
    copy.nodes[1]!.textContent = 'Delete project';
    const plan = planSync(master, copy, binding);
    expect(plan.binding.textOverrides).toEqual({ label: 'Delete project' });
    expect(plan.texts).toEqual([]);
  });
  it('updates inherited text when the master label changes', () => {
    const { master, copy } = pair('Save');
    const binding = enroll(master, copy);
    master.nodes[1]!.textContent = 'Save changes';
    expect(planSync(master, copy, binding).texts).toEqual([
      { sourceId: 'label', text: 'Save changes' },
    ]);
  });
  it('retains an explicit empty label', () => {
    const { master, copy } = pair('');
    expect(
      planSync(master, copy, enroll(master, copy)).binding.lastText.label,
    ).toBe('');
  });
  it('preserves the current placement and width while syncing component styles', () => {
    const { master, copy } = pair();
    copy.nodes[0]!.styles = {
      left: '100px',
      width: '300px',
      backgroundColor: 'red',
    };
    const binding = enroll(master, copy);
    copy.nodes[0]!.styles.left = '200px';
    master.nodes[0]!.styles = {
      left: '0px',
      width: '80px',
      backgroundColor: 'blue',
    };
    expect(planSync(master, copy, binding).styles).toEqual([
      { sourceId: 'button', styles: { backgroundColor: 'blue' } },
    ]);
  });
  it('does no work when structure and inherited properties agree', () => {
    const { master, copy } = pair();
    expect(hasChanges(planSync(master, copy, enroll(master, copy)))).toBe(
      false,
    );
  });
  it('accepts omitted zero padding from Paper', () => {
    const { master, copy } = pair();
    master.nodes[0]!.styles = { padding: '0px' };
    expect(planSync(master, copy, enroll(master, copy)).styles).toEqual([]);
  });
  it('clears nonzero padding when the master has zero padding', () => {
    const { master, copy } = pair();
    master.nodes[0]!.styles = { padding: '0px' };
    copy.nodes[0]!.styles = { paddingInline: '24px' };
    expect(planSync(master, copy, enroll(master, copy)).styles).toEqual([
      { sourceId: 'button', styles: { paddingInline: '' } },
    ]);
  });
  it('refuses to enroll an unmatched dropdown icon as a plain Button', () => {
    const { master, copy } = pair();
    copy.nodes.push({
      ...node('icon', 'copy'),
      component: 'SVG',
      svg: '<svg></svg>',
    });
    expect(() => enroll(master, copy)).toThrow('unmatched icon');
  });
  it('rejects deleting the only text slot instead of discarding an override', () => {
    const { master, copy } = pair();
    const binding = enroll(master, copy);
    master.nodes = [node('button', null)];
    expect(() => planSync(master, copy, binding)).toThrow('discard text');
  });
  it('rejects ambiguous text slots before enrollment', () => {
    const { master, copy } = pair();
    copy.nodes.push(node('caption', 'copy', [], 'Caption'));
    expect(() => enroll(master, copy)).toThrow('multiple text slots');
  });
  it('checks aliased token values across files', () => {
    const { master } = pair();
    master.nodes[0]!.styles = { color: 'var(--color-primary)' };
    expect(() =>
      checkTokens(
        master,
        new Map([
          ['--color-primary', 'var(--color-ink)'],
          ['--color-ink', 'black'],
        ]),
        new Map([
          ['--color-primary', 'var(--color-ink)'],
          ['--color-ink', 'red'],
        ]),
      ),
    ).toThrow('--color-ink');
  });
});

describe('static SVG transfer', () => {
  it('preserves token references without carrying Paper node IDs', () => {
    expect(
      svgFromJsx(
        '(<svg id="old" viewBox="0 0 16 16"><path stroke="var(--color-primary)" strokeWidth="2" /></svg>)',
      ),
    ).toBe(
      '<svg viewBox="0 0 16 16"><path stroke="var(--color-primary)" stroke-width="2"></path></svg>',
    );
  });
  it.each([
    '(<svg onLoad="run()"/>)',
    '(<svg width={run()}/>)',
    '(<svg><script /></svg>)',
  ])('rejects executable SVG input %s', (jsx) => {
    expect(() => svgFromJsx(jsx)).toThrow();
  });
});
