import type { VoicePreviewInput } from '@repo/contracts';
import { useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTRPC } from '#features/connection';
import { useVoiceConnection } from '../stores/voice-connection-context';

// A custom voice to hear before it is saved: the built-in voice is the one previewed.
type UnsavedVoice = VoicePreviewInput['custom'];

/*
 * Plays a voice's greeting where the App carries audio, and nowhere else: a built-in or saved custom voice by its id,
 * or a custom voice not saved yet as its built-in voice with its name and description. A preview the Server refuses,
 * as while a Voice call runs, plays nothing and says nothing. Leaving the page lets go of the preview's connection.
 */
export function useVoicePreview(): (
  voice: string,
  custom?: UnsavedVoice,
) => void {
  const connection = useVoiceConnection();
  const ask = useMutation(useTRPC().voice.preview.mutationOptions());

  useEffect(() => (): void => connection?.endPreview(), [connection]);

  const answerFor =
    (voice: string, custom: UnsavedVoice) =>
    async (offer: string): Promise<string> =>
      (await ask.mutateAsync({ voice, offer, custom })).answer;

  return (voice, custom) =>
    void connection?.preview(answerFor(voice, custom)).catch(() => {});
}
