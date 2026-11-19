import type { VoiceStatus } from '@repo/contracts';
import { useClock } from '@repo/kit/use-clock';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import type { ComposerVoice } from '#features/composer';
import { useTRPC } from '#features/connection';
import { sessionHref } from '#lib/product/navigation/navigation';
import { useNavigateFromShown } from '#lib/product/navigation/use-navigate-from-shown';
import {
  sessionVoice,
  type SessionVoice,
  type SessionVoiceActions,
  type SessionVoiceInput,
} from './session-voice';
import { startCall } from './start-call';
import { type SessionMutes, useSessionMutes } from './use-session-mutes';
import { useReleaseWhenOver, useVoiceStatus } from './use-voice-status';
import type { VoiceConnection, VoiceLevels } from './voice-connection';
import { useVoiceConnection } from './voice-connection-context';

const noLevels: VoiceLevels = { input: 0, output: 0 };

// A Session's title as the Sessions list reads it; none until it loads, or without a Session.
function useSessionTitle(sessionId: string | undefined): string | undefined {
  const trpc = useTRPC();
  const input = { sessionId, archived: false };

  const listed = useQuery({
    ...trpc.session.list.queryOptions(input),
    enabled: sessionId !== undefined,
  });

  return listed.data?.sessions[0]?.title;
}

// Starting a call, then resuming the page's Feed (see `startCall`).
function useStartCall(
  { sessionId, resumeFeed }: VoicePage,
  connection: VoiceConnection | null,
): () => void {
  const start = useMutation(useTRPC().voice.start.mutationOptions());

  return () =>
    void startCall(connection, {
      send: (offer) => start.mutateAsync({ sessionId, offer }),
      resumeFeed,
    });
}

function useActions(
  page: VoicePage,
  connection: VoiceConnection | null,
  mutes: SessionMutes,
): SessionVoiceActions {
  const end = useMutation(useTRPC().voice.end.mutationOptions());
  const navigate = useNavigateFromShown();

  return {
    start: useStartCall(page, connection),
    end: () => end.mutate({ sessionId: page.sessionId }),
    setMicrophoneMuted: mutes.setMicrophoneMuted,
    setSpeakerMuted: mutes.setSpeakerMuted,
    open: (target) => navigate(sessionHref(target)),
  };
}

// The orb reads the App's own levels each frame, so it moves without the page rendering again.
const useLevels = (connection: VoiceConnection | null): (() => VoiceLevels) =>
  useCallback(() => connection?.levels() ?? noLevels, [connection]);

type View = Pick<SessionVoice, 'stage' | 'partials'> & {
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

// What changes while the call runs: the timer's clock and the orb's levels.
function useLive(
  status: VoiceStatus,
  sessionId: string,
  connection: VoiceConnection | null,
): Pick<SessionVoiceInput, 'now' | 'levels'> {
  return {
    now: useClock(callSessionOf(status) === sessionId),
    levels: useLevels(connection),
  };
}

// The Session page a call is seen from, and how it opens its live Feed again after a start.
export interface VoicePage {
  sessionId: string;
  resumeFeed: () => void;
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
 * through `sessionVoice`. The Composer, the orb and the Feed's partial words all come from here, so none of them needs
 * another to have subscribed first.
 */
export function useSessionVoice(page: VoicePage): View {
  const connection = useVoiceConnection();
  const status = useVoiceStatus();
  useReleaseWhenOver(status, connection);
  const view = sessionVoice(useInput(page, connection, status));

  return { ...view, voice: connection ? view.composer : undefined };
}
