import { describe, expect, it } from 'vitest';
import {
  controlsOf,
  type ConversationSettingsControls,
} from './conversation-settings-controls';

type Recorded = { asked: string[]; controls: ConversationSettingsControls };

// What the page asked of the App, in order.
function recorded(): Recorded {
  const asked: string[] = [];

  const controls = controlsOf({
    change: (change) => asked.push(`change:${JSON.stringify(change)}`),
    setInstructions: (text) => asked.push(`instructions:${text}`),
    setCallOptions: (change) => asked.push(`options:${JSON.stringify(change)}`),
    saveCustomVoice: (voice) => asked.push(`save:${JSON.stringify(voice)}`),
    deleteCustomVoice: (id) => asked.push(`delete:${id}`),
    preview: (voice, custom) =>
      asked.push(
        custom
          ? `preview:${voice}:${JSON.stringify(custom)}`
          : `preview:${voice}`,
      ),
    retry: () => asked.push('retry'),
  });

  return { asked, controls };
}

const pirate = {
  id: 'pirate',
  label: ' Pirate ',
  baseVoice: 'sol',
  description: 'Speaks like a pirate.',
};

describe('Conversation settings controls', () => {
  it('keeps a picked voice for the next call and plays its greeting', () => {
    const { asked, controls } = recorded();

    controls.onVoiceChange('sol');

    expect(asked).toEqual(['change:{"voice":"sol"}', 'preview:sol']);
  });

  it('plays nothing when Conversations or the provider change', () => {
    const { asked, controls } = recorded();

    controls.onEnabledChange(false);
    controls.onProviderChange('gpt-live');

    expect(asked).toEqual([
      'change:{"enabled":false}',
      'change:{"provider":"gpt-live"}',
    ]);
  });

  it('plays a voice without choosing it', () => {
    const { asked, controls } = recorded();

    controls.onPreviewVoice('maple');

    expect(asked).toEqual(['preview:maple']);
  });

  it('keeps the instructions and the call options', () => {
    const { asked, controls } = recorded();

    controls.onInstructionsChange('Call me Sam.');
    controls.onCallOptionsChange({ volume: 80 });

    expect(asked).toEqual([
      'instructions:Call me Sam.',
      'options:{"volume":80}',
    ]);
  });

  it('saves a custom voice trimmed, hears it before it is saved, and deletes it', () => {
    const { asked, controls } = recorded();

    controls.onPreviewCustomVoice(pirate);
    controls.onSaveCustomVoice(pirate);
    controls.onDeleteCustomVoice('pirate');

    expect(asked).toEqual([
      'preview:sol:{"label":"Pirate","description":"Speaks like a pirate."}',
      'save:{"id":"pirate","label":"Pirate","baseVoice":"sol","description":"Speaks like a pirate."}',
      'delete:pirate',
    ]);
  });
});
