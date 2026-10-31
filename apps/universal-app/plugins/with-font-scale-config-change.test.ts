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
  it('has the Activity answer a configuration change', () => {
    expect(passFontScaleOn(mainActivity)).toContain(
      'override fun onConfigurationChanged',
    );
  });

  it('sends the scale under the name the App listens for', () => {
    expect(passFontScaleOn(mainActivity)).toContain(fontScaleEvent);
  });

  it('keeps what the Activity already does', () => {
    expect(passFontScaleOn(mainActivity)).toContain(
      'override fun getMainComponentName(): String = "main"',
    );
  });

  it('leaves an Activity that already passes it on as it is', () => {
    const passed = passFontScaleOn(mainActivity);

    expect(passFontScaleOn(passed)).toBe(passed);
  });
});
