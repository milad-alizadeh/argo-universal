import { describe, expect, it } from 'vitest';
import { withFontScale } from './with-font-scale-config-change.mjs';

describe('withFontScale', () => {
  it('adds fontScale to the configuration changes the Activity handles', () => {
    expect(withFontScale('orientation|uiMode')).toBe(
      'orientation|uiMode|fontScale',
    );
  });

  it('leaves a list that already handles fontScale as it is', () => {
    expect(withFontScale('uiMode|fontScale')).toBe('uiMode|fontScale');
  });

  it('starts a list when the Activity declares none', () => {
    expect(withFontScale()).toBe('fontScale');
  });
});
