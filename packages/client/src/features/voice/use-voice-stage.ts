import type { VoiceStatus } from '@repo/contracts';
import { useClock } from '@repo/kit/use-clock';
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useTRPC } from '#features/connection';
import { voiceLabel } from './components/voice-stage/voice-label';
import type { VoiceStageViewProps } from './components/voice-stage/voice-stage-view';
import type { VoiceLevels } from './voice-connection';
import { useVoiceConnection } from './voice-connection-context';

type Call = NonNullable<VoiceStatus['call']>;

const noLevels: VoiceLevels = { input: 0, output: 0 };

// The orb reads the App's own levels each frame, so it moves without the page rendering again.
function useLevels(): () => VoiceLevels {
  const connection = useVoiceConnection();

  return useCallback(() => connection?.levels() ?? noLevels, [connection]);
}

const useStatusCall = (): Call | null | undefined =>
  useQuery(useTRPC().voice.status.queryOptions()).data?.call;

// The call, when it runs in this Session.
function useCallHere(sessionId: string): Call | undefined {
  const call = useStatusCall();

  return call?.sessionId === sessionId ? call : undefined;
}

/*
 * What the page pins above the Feed while this Session's call runs: the orb's state and levels and the label's words.
 * Nothing for any other Session, or when no call runs.
 */
export function useVoiceStage(
  sessionId: string,
): VoiceStageViewProps | undefined {
  const here = useCallHere(sessionId);
  const now = useClock(here !== undefined);
  const levels = useLevels();

  return here && { state: here.orb, levels, label: voiceLabel(here, now) };
}
