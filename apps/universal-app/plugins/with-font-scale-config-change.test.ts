import { describe, expect, it } from 'vitest';
import { addFontScale } from './with-font-scale-config-change.mjs';

describe('addFontScale', () => {
  it('adds fontScale to the configuration changes the Activity handles', () => {
    expect(addFontScale('orientation|uiMode')).toBe(
      'orientation|uiMode|fontScale',
    );
  });

  it('leaves a list that already handles fontScale as it is', () => {
    expect(addFontScale('uiMode|fontScale')).toBe('uiMode|fontScale');
  });

  it('starts a list when the Activity declares none', () => {
    expect(addFontScale()).toBe('fontScale');
  });
});
