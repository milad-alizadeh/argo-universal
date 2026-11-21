import { useCallback } from 'react';
import {
  type ConversationConnection,
  silentSpectrum,
  type VoiceSpectrum,
} from '../types/conversation-connection';

const noSpectrum = silentSpectrum();

// The band reads audio on each frame without rerendering its parent.
export function useSpectrum(
  connection: ConversationConnection | null,
): () => VoiceSpectrum {
  return useCallback(() => connection?.spectrum() ?? noSpectrum, [connection]);
}
