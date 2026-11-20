import type { VoiceStatus } from '@repo/contracts';
import { useClock } from '@repo/kit/use-clock';
import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';
import type { ComposerVoice } from '#features/composer';
import { useTRPC } from '#features/connection';
import { sessionHref } from '#lib/product/navigation/navigation';
import { useNavigateFromShown } from '#lib/product/navigation/use-navigate-from-shown';
import { withEdge } from '../components/conversation-band/conversation-band-slot';
import { placedCall } from '../stores/placed-conversation';
import { useVoiceConnection } from '../stores/conversation-connection-context';
import {
  silentSpectrum,
  type VoiceConnection,
  type VoiceSpectrum,
} from '../types/conversation-connection';
import {
  sessionVoice,
  type SessionVoice,
  type SessionVoiceActions,
  type SessionVoiceInput,
} from '../utils/session-conversation';
import { useSessionTitle, useStartCall } from './use-conversation-reads';
import { useHeldPartials } from './use-held-partials';
import { type SessionMutes, useSessionMutes } from './use-session-mutes';
import { useVoiceStatus } from './use-conversation-status';

const noSpectrum = silentSpectrum();

// The Session page a call is seen from, and how it opens its live Feed again after a start.
export interface VoicePage {
  sessionId: string;
  resumeFeed: () => void;
}

// Starts the call in the Session the page shows, then resumes the page's Feed (see `startCall`).
function useStartHere(
  { sessionId, resumeFeed }: VoicePage,
  connection: VoiceConnection | null,
): () => void {
  const start = useStartCall(connection, resumeFeed);

  return () => start(sessionId);
}

// Ending lets go of a call still being placed here, and ends the Server's call if it has one.
function endHere(
  sessionId: string,
  end: (input: { sessionId: string }) => void,
): void {
  placedCall.release(sessionId);
  end({ sessionId });
}

function useActions(
  page: VoicePage,
  connection: VoiceConnection | null,
  mutes: SessionMutes,
): SessionVoiceActions {
  const end = useMutation(useTRPC().voice.end.mutationOptions());
  const navigate = useNavigateFromShown();

  return {
    start: useStartHere(page, connection),
    end: () => endHere(page.sessionId, end.mutate),
    setMicrophoneMuted: mutes.setMicrophoneMuted,
    setSpeakerMuted: mutes.setSpeakerMuted,
    open: (target) => navigate(sessionHref(target)),
  };
}

// The band reads the App's own bands each frame, so it moves without the page rendering again.
const useSpectrum = (
  connection: VoiceConnection | null,
): (() => VoiceSpectrum) =>
  useCallback(() => connection?.spectrum() ?? noSpectrum, [connection]);

type View = Pick<SessionVoice, 'partials'> & {
  // Absent where this App carries no audio, so the Composer offers no voice button.
  voice: ComposerVoice | undefined;
};

// The Session the call runs in, when it runs in another one than the page shows.
const elsewhereOf = (
  callSession: string | undefined,
  sessionId: string,
): string | undefined => (callSession === sessionId ? undefined : callSession);

const callSessionOf = (status: VoiceStatus): string | undefined =>
  status.call?.sessionId;

// A Session's title when it is the one the call runs in, and the page shows another.
function useTitleOf(
  status: VoiceStatus,
  sessionId: string,
): SessionVoiceInput['titleOf'] {
  const callSession = callSessionOf(status);
  const title = useSessionTitle(elsewhereOf(callSession, sessionId));

  return (id) => (id === callSession ? title : undefined);
}

// What changes while the call runs: the timer's clock.
function useLive(
  status: VoiceStatus,
  sessionId: string,
  connection: VoiceConnection | null,
): Pick<SessionVoiceInput, 'now' | 'spectrum'> {
  return {
    now: useClock(callSessionOf(status) === sessionId),
    spectrum: useSpectrum(connection),
  };
}

function useInput(
  { sessionId, resumeFeed }: VoicePage,
  connection: VoiceConnection | null,
  status: VoiceStatus,
): SessionVoiceInput {
  const mutes = useSessionMutes(connection);

  return {
    status,
    sessionId,
    ...useLive(status, sessionId, connection),
    mutes: mutes.mutes,
    titleOf: useTitleOf(status, sessionId),
    actions: useActions({ sessionId, resumeFeed }, connection, mutes),
  };
}

/*
 * A Session page's view of the Voice call: the one place that follows the Server's status and the connection, read
 * through `sessionVoice`. The Composer, with the band along its edge, and the Feed's partial words all come from here,
 * so none of them needs another to have subscribed first.
 */
export function useSessionVoice(page: VoicePage): View {
  const connection = useVoiceConnection();
  const status = useVoiceStatus();
  const view = sessionVoice(useInput(page, connection, status));
  const partials = useHeldPartials(view.partials);

  return {
    partials,
    voice: connection ? withEdge(view.composer, view.band) : undefined,
  };
}
