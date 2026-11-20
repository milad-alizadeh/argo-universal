import { afterEach, describe, expect, it, vi } from 'vitest';
import { memoryStorage } from '../../../../mocks/memory-storage';
import {
  loadConversationDeviceChoice,
  saveVoiceDeviceChoice,
} from './conversation-device-choice';

afterEach(() => vi.unstubAllGlobals());

describe('Microphone and speaker chosen on this Device', () => {
  it('follows the system until a device is chosen, and remembers the choice across App starts', async () => {
    vi.stubGlobal('window', { localStorage: memoryStorage() });
    await expect(loadConversationDeviceChoice()).resolves.toEqual({
      microphone: null,
      speaker: null,
    });

    saveVoiceDeviceChoice({ microphone: 'mic-b', speaker: null });
    await expect(loadConversationDeviceChoice()).resolves.toEqual({
      microphone: 'mic-b',
      speaker: null,
    });

    saveVoiceDeviceChoice({ microphone: 'mic-b', speaker: 'spk-a' });
    await expect(loadConversationDeviceChoice()).resolves.toEqual({
      microphone: 'mic-b',
      speaker: 'spk-a',
    });
  });

  it('follows the system when what is stored cannot be read', async () => {
    const storage = memoryStorage();
    storage.setItem('voice-devices', '{"microphone": 7');
    vi.stubGlobal('window', { localStorage: storage });

    await expect(loadConversationDeviceChoice()).resolves.toEqual({
      microphone: null,
      speaker: null,
    });
  });
});
