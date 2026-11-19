import { useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTRPC } from '#features/connection';
import { useVoiceConnection } from '../stores/voice-connection-context';

/*
 * Plays a voice's greeting where the App carries audio, and nowhere else. A preview the Server refuses, as while a
 * Voice call runs, plays nothing and says nothing. Leaving the page lets go of the preview's connection.
 */
export function useVoicePreview(): (voice: string) => void {
  const connection = useVoiceConnection();
  const ask = useMutation(useTRPC().voice.preview.mutationOptions());

  useEffect(() => (): void => connection?.endPreview(), [connection]);

  const answerFor =
    (voice: string) =>
    async (offer: string): Promise<string> =>
      (await ask.mutateAsync({ voice, offer })).answer;

  return (voice) => void connection?.preview(answerFor(voice)).catch(() => {});
}
