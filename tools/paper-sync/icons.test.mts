import { describe, expect, it } from 'vitest';
import { enroll } from './bind.mts';
import { node, pair } from './fixtures.mts';
import { required, type Snapshot } from './model.mts';
import { hasChanges, planSync } from './plan.mts';

const iconStyles = { width: '16px', height: '16px', fill: 'var(--color-ink)' };

function addIcon(
  snapshot: Snapshot,
  icon: { id: string; parentId: string; glyph: string },
): void {
  snapshot.nodes.push({
    ...node(icon.id, icon.parentId),
    name: `Icon / ${icon.glyph}`,
    component: 'SVG',
    styles: { ...iconStyles },
    svg: `<svg viewBox="0 0 16 16"><path d="${icon.glyph}"></path></svg>`,
  });
  required(
    snapshot.nodes.find((item) => item.id === icon.parentId),
  ).childIds.push(icon.id);
}

function iconPair(): ReturnType<typeof pair> {
  const { master, copy } = pair();
  addIcon(master, { id: 'icon', parentId: 'button', glyph: 'more' });
  addIcon(copy, { id: 'glyph', parentId: 'copy', glyph: 'trash' });

  return { master, copy };
}

describe('icon slots', () => {
  it('enrolls a copy with its own glyph and reports no drift', () => {
    const { master, copy } = iconPair();
    const binding = enroll(master, copy);
    expect(binding.nodes.icon).toBe('glyph');
    expect(hasChanges(planSync(master, copy, binding))).toBe(false);
  });

  it('keeps the copy glyph while applying a master size change', () => {
    const { master, copy } = iconPair();
    const binding = enroll(master, copy);
    required(master.nodes[2]).styles.width = '20px';
    const plan = planSync(master, copy, binding);
    expect(plan.styles).toEqual([
      { sourceId: 'icon', styles: { width: '20px' } },
    ]);
    expect(plan.binding.nodes.icon).toBe('glyph');
    expect(plan.svgReplacements).toEqual([]);
    expect(plan.creates).toEqual([]);
    expect(plan.removes).toEqual([]);
  });

  it('still reports a different colour token on the icon', () => {
    const { master, copy } = iconPair();
    required(copy.nodes[2]).styles.fill = 'var(--color-danger)';
    const plan = planSync(master, copy, enroll(master, copy));
    expect(plan.styles).toEqual([
      { sourceId: 'icon', styles: { fill: 'var(--color-ink)' } },
    ]);
  });

  it('matches repeated icons by their parent layer', () => {
    const { master, copy } = iconPair();

    for (const [snapshot, root, suffix] of [
      [master, 'button', 'm'],
      [copy, 'copy', 'c'],
    ] as const) {
      snapshot.nodes.push({ ...node(`trailing-${suffix}`, root), name: 'End' });
      required(snapshot.nodes[0]).childIds.push(`trailing-${suffix}`);
    }

    addIcon(master, { id: 'chevron', parentId: 'trailing-m', glyph: 'down' });
    addIcon(copy, { id: 'arrow', parentId: 'trailing-c', glyph: 'right' });
    const binding = enroll(master, copy);
    expect(binding.nodes.icon).toBe('glyph');
    expect(binding.nodes.chevron).toBe('arrow');
  });

  it('rejects a master with two icon slots of the same name', () => {
    const { master, copy } = iconPair();
    addIcon(master, { id: 'second', parentId: 'button', glyph: 'close' });
    expect(() => enroll(master, copy)).toThrow('ambiguous icon slot "Icon"');
  });
});
