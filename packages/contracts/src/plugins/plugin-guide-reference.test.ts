import { describe, expect, it } from 'vitest';
import { kitComponents } from './kit';
import { kitReference } from './plugin-guide-reference';

describe('the kit reference', () => {
  const reference = kitReference();

  it('lists every component a Plugin can draw, under its own name', () => {
    for (const name of Object.keys(kitComponents))
      expect(reference).toContain(`### ${name}\n`);
  });

  it('marks a required prop apart from an optional one, as the schema does', () => {
    expect(reference).toContain('- `label`: string');
    expect(reference).toContain('- `variant?`:');
  });

  it('writes a long run of values once, under its own heading', () => {
    expect(reference).toMatch(/- `icon\?`: one of Icon/);
    expect(reference.match(/- \*\*Icon\*\*:/g)).toHaveLength(1);
  });

  it('calls a prop that takes an action an event value, made by `to`', () => {
    expect(reference).toContain('- `onPress?`: event value');
  });
});
