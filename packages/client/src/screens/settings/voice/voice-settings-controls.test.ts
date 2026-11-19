import { describe, expect, it } from 'vitest';
import {
  controlsOf,
  type VoiceSettingsControls,
} from './voice-settings-controls';

type Recorded = { asked: string[]; controls: VoiceSettingsControls };

// What the page asked of the App, in order.
function recorded(): Recorded {
  const asked: string[] = [];

  const controls = controlsOf({
    change: (change) => asked.push(`change:${JSON.stringify(change)}`),
    preview: (voice) => asked.push(`preview:${voice}`),
    retry: () => asked.push('retry'),
  });

  return { asked, controls };
}

describe('Voice settings controls', () => {
  it('keeps a picked voice for the next call and plays its greeting', () => {
    const { asked, controls } = recorded();

    controls.onVoiceChange('sol');

    expect(asked).toEqual(['change:{"voice":"sol"}', 'preview:sol']);
  });

  it('plays nothing when Voice calls or the provider change', () => {
    const { asked, controls } = recorded();

    controls.onEnabledChange(false);
    controls.onProviderChange('gpt-live');

    expect(asked).toEqual([
      'change:{"enabled":false}',
      'change:{"provider":"gpt-live"}',
    ]);
  });
});
