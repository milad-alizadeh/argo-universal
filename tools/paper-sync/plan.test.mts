import { describe, expect, it } from 'vitest';
import { enroll } from './bind.mts';
import { node, pair } from './fixtures.mts';
import { required } from './model.mts';
import { hasChanges, planSync } from './plan.mts';

describe('Paper component sync', () => {
  it('moves an overridden label into a new master wrapper without replacing its node', () => {
    const { master, copy } = pair();
    const binding = enroll(master, copy);
    master.nodes = [
      node('button', null, { children: ['wrap'] }),
      node('wrap', 'button', { children: ['label'] }),
      node('label', 'wrap', { text: 'Save now' }),
    ];
    const plan = planSync(master, copy, binding);
    expect(plan.creates.map((creation) => creation.sourceId)).toEqual(['wrap']);
    expect(plan.moves).toContainEqual({
      sourceId: 'label',
      parentSourceId: 'wrap',
      index: 0,
    });
    expect(plan.binding.nodes.label).toBe('text');
    expect(plan.binding.lastText.Label).toBe('Publish');
    expect(plan.removes).toEqual([]);
    expect(plan.texts).toEqual([]);
  });
  it('removes obsolete structure while rescuing the text node', () => {
    const { master, copy } = pair();
    copy.nodes = [
      node('copy', null, { children: ['old'] }),
      node('old', 'copy', { children: ['text'] }),
      node('text', 'old', { text: 'Publish' }),
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
    required(copy.nodes[1]).textContent = 'Delete project';
    const plan = planSync(master, copy, binding);
    expect(plan.binding.textOverrides).toEqual({ Label: 'Delete project' });
    expect(plan.texts).toEqual([]);
  });
  it('updates inherited text when the master label changes', () => {
    const { master, copy } = pair('Save');
    const binding = enroll(master, copy);
    required(master.nodes[1]).textContent = 'Save changes';
    expect(planSync(master, copy, binding).texts).toEqual([
      { sourceId: 'label', text: 'Save changes' },
    ]);
  });
  it('retains an explicit empty label', () => {
    const { master, copy } = pair('');
    expect(
      planSync(master, copy, enroll(master, copy)).binding.lastText.Label,
    ).toBe('');
  });
  it('preserves the current placement and width while syncing component styles', () => {
    const { master, copy } = pair();
    required(copy.nodes[0]).styles = {
      left: '100px',
      width: '300px',
      backgroundColor: 'red',
    };
    const binding = enroll(master, copy);
    required(copy.nodes[0]).styles.left = '200px';
    required(master.nodes[0]).styles = {
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
    required(master.nodes[0]).styles = { padding: '0px' };
    expect(planSync(master, copy, enroll(master, copy)).styles).toEqual([]);
  });
  it('clears nonzero padding when the master has zero padding', () => {
    const { master, copy } = pair();
    required(master.nodes[0]).styles = { padding: '0px' };
    required(copy.nodes[0]).styles = { paddingInline: '24px' };
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
    copy.nodes.push(node('caption', 'copy', { text: 'Caption' }));
    expect(() => enroll(master, copy)).toThrow('ambiguous text slot');
  });
});
