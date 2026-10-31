import { describe, expect, it } from 'vitest';
import { fontScaleEvent } from '../src/lib/font-scale';
import {
  addFontScale,
  passFontScaleOn,
} from './with-font-scale-config-change.mjs';

const mainActivity = `package dev.argo.app

class MainActivity : ReactActivity() {
  override fun getMainComponentName(): String = "main"
}
`;

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

describe('passFontScaleOn', () => {
  it.each([
    ['answers a configuration change', 'override fun onConfigurationChanged'],
    ['sends the scale under the name the App listens for', fontScaleEvent],
    ['keeps what it already does', 'override fun getMainComponentName()'],
  ])('leaves an Activity that %s', (_behaviour, kotlin) => {
    expect(passFontScaleOn(mainActivity)).toContain(kotlin);
  });

  it('puts the override inside the class, not after it', () => {
    const passed = passFontScaleOn(mainActivity);

    expect(passed.indexOf('onConfigurationChanged')).toBeGreaterThan(
      passed.indexOf('class MainActivity'),
    );
    expect(passed.indexOf('onConfigurationChanged')).toBeLessThan(
      passed.lastIndexOf('}'),
    );
  });

  it('leaves an Activity that already passes it on as it is', () => {
    const passed = passFontScaleOn(mainActivity);

    expect(passFontScaleOn(passed)).toBe(passed);
  });
});
