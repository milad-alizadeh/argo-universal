import type { VoicePreviewInput } from '@repo/contracts';
import { useEffect, useMemo } from 'react';
import { useVoiceConnection } from '../stores/voice-connection-context';
import { VoicePreviewer } from '../stores/voice-previewer';
import { usePreviewServer } from './use-preview-server';

// A custom voice to hear before it is saved: the built-in voice is the one previewed.
type UnsavedVoice = VoicePreviewInput['custom'];

/*
 * Plays a voice's greeting where the App carries audio, and nowhere else: a built-in or saved custom voice by its id,
 * or a custom voice not saved yet as its built-in voice with its name and description. The Server keeps the greeting
 * the first preview records, and later previews play it with no provider call. Picking another voice stops the one
 * playing or loading. A preview the Server refuses, as while a Voice call runs, plays nothing and says nothing.
 * Leaving the page lets go of the preview's connection.
 */
export function useVoicePreview(): (
  voice: string,
  custom?: UnsavedVoice,
) => void {
  const connection = useVoiceConnection();
  const server = usePreviewServer();

  const previewer = useMemo(
    () => (connection ? new VoicePreviewer(connection, server) : null),
    [connection, server],
  );

  useEffect(() => (): void => previewer?.stop(), [previewer]);

  return (voice, custom) => void previewer?.play({ voice, custom });
}
