import type { Conversation, ConversationStatus } from '@repo/contracts';
import { listenerSet } from '@repo/kit/listener-set';
import { useSyncExternalStore } from 'react';

/*
 * The call the person has just asked for, before the Server has it. Opening the microphone, making the offer and the
 * Server's start take a moment, and the Conversation's band shows from the press, so the App holds the Session it is placing
 * the call in until the Server's own call takes over or the start fails. One Conversation runs per App, so one is held.
 */
class PlacedConversation {
  private sessionId: string | null = null;
  private readonly listeners = listenerSet();

  public read = (): string | null => this.sessionId;

  public subscribe = this.listeners.subscribe;

  public place(sessionId: string): void {
    this.set(sessionId);
  }

  // Whether the call placed in this Session is still wanted: ending it before the Server answered lets it go.
  public holds(sessionId: string): boolean {
    return this.sessionId === sessionId;
  }

  // The Server has the call, or the start failed or was ended: only that Session's placing is let go.
  public release(sessionId: string): void {
    if (this.holds(sessionId)) this.set(null);
  }

  private set(sessionId: string | null): void {
    this.sessionId = sessionId;
    this.listeners.notify();
  }
}

export const placedConversation = new PlacedConversation();

// The Session a call is being placed in, as the App holds it.
export const usePlacedConversation = (): string | null =>
  useSyncExternalStore(
    placedConversation.subscribe,
    placedConversation.read,
    placedConversation.read,
  );

// What a placed call looks like until the Server has it: connecting, with nothing to show on the band yet.
const placingIn = (sessionId: string): Conversation => ({
  conversationId: 'placing',
  sessionId,
  status: 'connecting',
  state: 'none',
  trouble: null,
  startedAt: null,
});

// The Server's call when it has one; otherwise the call being placed, so the band and End show from the press.
export const withPlacedConversation = (
  status: ConversationStatus,
  placed: string | null,
): ConversationStatus =>
  status.conversation || placed === null
    ? status
    : { ...status, conversation: placingIn(placed) };
