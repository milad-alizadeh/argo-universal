import type { ConversationStatus } from '@repo/contracts';
import { useClock } from '@repo/kit/use-clock';
import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useTRPC } from '#features/connection';
import { sessionHref } from '#lib/product/navigation/navigation';
import { useNavigateFromShown } from '#lib/product/navigation/use-navigate-from-shown';
import { withEdge } from '../components/conversation-band/conversation-band-slot';
import { useConversationConnection } from '../stores/conversation-connection-context';
import { placedConversation } from '../stores/placed-conversation';
import {
  silentSpectrum,
  type ConversationConnection,
  type VoiceSpectrum,
} from '../types/conversation-connection';
import {
  sessionConversation,
  type SessionConversationActions,
  type SessionConversationInput,
} from '../utils/session-conversation';
import {
  sessionPageConversation,
  type SessionPageConversation,
} from '../utils/session-conversation-page';
import { useSessionTitle, useStartCall } from './use-conversation-reads';
import { useConversationStatus } from './use-conversation-status';
import { useHeldPartials } from './use-held-partials';
import { type SessionMutes, useSessionMutes } from './use-session-mutes';

const noSpectrum = silentSpectrum();

// The Session page a call is seen from, and how it opens its live Feed again after a start.
export interface ConversationPage {
  sessionId: string;
  resumeFeed: () => void;
}

// Starts the call in the Session the page shows, then resumes the page's Feed (see `startConversation`).
function useStartHere(
  { sessionId, resumeFeed }: ConversationPage,
  connection: ConversationConnection | null,
): () => void {
  const start = useStartCall(connection, resumeFeed);

  return () => start(sessionId);
}

// Ending lets go of a call still being placed here, and ends the Server's call if it has one.
function endHere(
  sessionId: string,
  end: (input: { sessionId: string }) => void,
): void {
  placedConversation.release(sessionId);
  end({ sessionId });
}

function useActions(
  page: ConversationPage,
  connection: ConversationConnection | null,
  mutes: SessionMutes,
): SessionConversationActions {
  const end = useMutation(useTRPC().conversation.end.mutationOptions());
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
  connection: ConversationConnection | null,
): (() => VoiceSpectrum) =>
  useCallback(() => connection?.spectrum() ?? noSpectrum, [connection]);

// The Session the call runs in, when it runs in another one than the page shows.
const elsewhereOf = (
  callSession: string | undefined,
  sessionId: string,
): string | undefined => (callSession === sessionId ? undefined : callSession);

const callSessionOf = (status: ConversationStatus): string | undefined =>
  status.conversation?.sessionId;

// A Session's title when it is the one the call runs in, and the page shows another.
function useTitleOf(
  status: ConversationStatus,
  sessionId: string,
): SessionConversationInput['titleOf'] {
  const callSession = callSessionOf(status);
  const title = useSessionTitle(elsewhereOf(callSession, sessionId));

  return (id) => (id === callSession ? title : undefined);
}

// What changes while the call runs: the timer's clock.
function useLive(
  status: ConversationStatus,
  sessionId: string,
  connection: ConversationConnection | null,
): Pick<SessionConversationInput, 'now' | 'spectrum'> {
  return {
    now: useClock(callSessionOf(status) === sessionId),
    spectrum: useSpectrum(connection),
  };
}

function useInput(
  { sessionId, resumeFeed }: ConversationPage,
  connection: ConversationConnection | null,
  status: ConversationStatus,
): SessionConversationInput {
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
 * A Session page's view of the Conversation: the one place that follows the Server's status and the connection, read
 * through `sessionConversation`. The Composer, with the band along its edge, and the Feed's partial words all come from here,
 * so none of them needs another to have subscribed first.
 */
export function useSessionConversation(
  page: ConversationPage,
): SessionPageConversation {
  const connection = useConversationConnection();
  const status = useConversationStatus();
  const view = sessionConversation(useInput(page, connection, status));
  const partials = useHeldPartials(view.partials);

  return sessionPageConversation(connection, { ...view, partials }, withEdge);
}
