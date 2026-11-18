import { useClock } from '@repo/kit/use-clock';
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useTRPC } from '#features/connection';
import { voiceLabel } from './components/voice-stage/voice-label';
import type { VoiceStageViewProps } from './components/voice-stage/voice-stage-view';
import type { VoiceLevels } from './voice-connection';
import { useVoiceConnection } from './voice-connection-context';

const noLevels: VoiceLevels = { input: 0, output: 0 };

/*
 * What the page pins above the Feed while this Session's call runs: the orb's state and levels and the label's words.
 * Nothing for any other Session, or when no call runs. The levels come from the App's own connection each frame.
 */
export function useVoiceStage(
  sessionId: string,
): VoiceStageViewProps | undefined {
  const call = useQuery(useTRPC().voice.status.queryOptions()).data?.call;
  const connection = useVoiceConnection();
  const here = call?.sessionId === sessionId ? call : undefined;
  const now = useClock(here !== undefined);
  const levels = useCallback(
    () => connection?.levels() ?? noLevels,
    [connection],
  );

  return here && { state: here.orb, levels, label: voiceLabel(here, now) };
}
