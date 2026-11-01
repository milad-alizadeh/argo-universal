import { describe, expect, it } from 'vitest';
import { elicitationSheetLayout } from './elicitation-sheet-detents';

// A sheet whose content scrolls itself is given no height to fill unless it names its detents.
describe('the Elicitation sheet layout', () => {
  it.each(['ios', 'android'] as const)(
    'names a height on %s when its fields scroll themselves',
    (os) => {
      const layout = elicitationSheetLayout(os);

      expect(layout.contentScrolls).toBe(true);
      expect(layout.detents).toContain('large');
    },
  );

  it('rests Android only at its full height', () => {
    expect(elicitationSheetLayout('android').detents).toEqual(['large']);
  });

  it('leaves the web sheet to fit its fields', () => {
    expect(elicitationSheetLayout('web')).toEqual({});
  });
});
