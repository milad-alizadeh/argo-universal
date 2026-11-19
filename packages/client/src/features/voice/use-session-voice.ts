import type { VoiceStatus } from '@repo/contracts';
import { useClock } from '@repo/kit/use-clock';
import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';
import type { ComposerVoice } from '#features/composer';
import { useTRPC } from '#features/connection';
import { sessionHref } from '#lib/product/navigation/navigation';
import { useNavigateFromShown } from '#lib/product/navigation/use-navigate-from-shown';
import { withEdge } from './components/voice-edge-band/voice-edge-slot';
import type { VoiceVisualiserKind } from './components/voice-visualiser/voice-visualiser-kind';
import {
  sessionVoice,
  type SessionVoice,
  type SessionVoiceActions,
  type SessionVoiceInput,
} from './session-voice';
import { useSessionTitle, useStartCall } from './use-call-reads';
import { type SessionMutes, useSessionMutes } from './use-session-mutes';
import { useVoiceStatus } from './use-voice-status';
import {
  silentSpectrum,
  type VoiceConnection,
  type VoiceLevels,
  type VoiceSpectrum,
} from './voice-connection';
import { useVoiceConnection } from './voice-connection-context';
import { useVoiceVisualiser } from './voice-visualiser-choice';

const noLevels: VoiceLevels = { input: 0, output: 0 };

const noSpectrum = silentSpectrum();

// Starts the call in the Session the page shows.
function useStartHere(
  sessionId: string,
  connection: VoiceConnection | null,
): () => void {
  const start = useStartCall(connection);

  return () => start(sessionId);
}

function useActions(
  sessionId: string,
  connection: VoiceConnection | null,
  mutes: SessionMutes,
): SessionVoiceActions {
  const end = useMutation(useTRPC().voice.end.mutationOptions());
  const navigate = useNavigateFromShown();

  return {
    start: useStartHere(sessionId, connection),
    end: () => end.mutate({ sessionId }),
    setMicrophoneMuted: mutes.setMicrophoneMuted,
    setSpeakerMuted: mutes.setSpeakerMuted,
    open: (target) => navigate(sessionHref(target)),
  };
}

// The orb reads the App's own levels each frame, so it moves without the page rendering again.
const useLevels = (connection: VoiceConnection | null): (() => VoiceLevels) =>
  useCallback(() => connection?.levels() ?? noLevels, [connection]);

// The matrix and the wave read the App's own bands each frame, as the orb reads its levels.
const useSpectrum = (
  connection: VoiceConnection | null,
): (() => VoiceSpectrum) =>
  useCallback(() => connection?.spectrum() ?? noSpectrum, [connection]);

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
): Pick<SessionVoiceInput, 'now' | 'levels' | 'spectrum'> {
  return {
    now: useClock(callSessionOf(status) === sessionId),
    levels: useLevels(connection),
    spectrum: useSpectrum(connection),
  };
}

function useInput(
  sessionId: string,
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
    actions: useActions(sessionId, connection, mutes),
  };
}

// The visualiser toggle shows only where this App carries the call's audio: elsewhere there is no sound to draw.
const withToggle = (
  stage: NonNullable<SessionVoice['stage']>,
  connection: VoiceConnection | null,
  { kind, choose }: ReturnType<typeof useVoiceVisualiser>,
): NonNullable<SessionVoice['stage']> =>
  connection ? { ...stage, visualiser: { kind, onChange: choose } } : stage;

// The Composer's slot, with the band along its edge when this Device chose to draw the call there.
const composerOf = (
  view: SessionVoice,
  kind: VoiceVisualiserKind,
): ComposerVoice | undefined =>
  withEdge(view.composer, kind === 'band' ? view.band : undefined);

/*
 * A Session page's view of the Voice call: the one place that follows the Server's status and the connection, read
 * through `sessionVoice`. The Composer, the orb and the Feed's partial words all come from here, so none of them needs
 * another to have subscribed first.
 */
export function useSessionVoice(sessionId: string): View {
  const connection = useVoiceConnection();
  const status = useVoiceStatus();
  const view = sessionVoice(useInput(sessionId, connection, status));
  const visualiser = useVoiceVisualiser();

  return {
    partials: view.partials,
    stage: view.stage && withToggle(view.stage, connection, visualiser),
    voice: connection ? composerOf(view, visualiser.kind) : undefined,
  };
}
