import { useMemo } from 'react';
import { useTRPCClient } from '#features/connection';
import type { PreviewServer } from '../stores/voice-previewer';

// What a preview asks of the Server, through the App's connection to it.
export function usePreviewServer(): PreviewServer {
  const { voice } = useTRPCClient();

  return useMemo(
    () => ({
      clipOf: async (input) => (await voice.getPreviewClip.query(input)).clip,
      answer: async (input, offer) =>
        (await voice.preview.mutate({ ...input, offer })).answer,
      storeClip: async (input, clip) => {
        await voice.storePreviewClip.mutate({ ...input, clip });
      },
    }),
    [voice],
  );
}
