import { createContext, useContext } from 'react';
import type { VoiceConnection } from './voice-connection';

// What carries a Voice call's audio where the App runs; null where none can, so no voice button is offered.
const VoiceConnectionContext = createContext<VoiceConnection | null>(null);

export const useVoiceConnection = (): VoiceConnection | null =>
  useContext(VoiceConnectionContext);

// Gives a subtree the connection that carries its Voice calls.
export const VoiceConnectionProvider = VoiceConnectionContext.Provider;
