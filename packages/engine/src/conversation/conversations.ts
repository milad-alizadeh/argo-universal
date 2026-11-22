import { randomUUID } from 'node:crypto';
import type {
  ConversationAvailability,
  ConversationEndOutput,
  VoicePreviewInput,
  VoicePreviewOutput,
  ConversationStartInput,
  ConversationStartOutput,
  ConversationStatus,
  ConversationUpdate,
} from '@repo/contracts';
import { waitFor } from 'xstate';
import type { RpcConnection } from '../rpc';
import { Changes } from './changes';
import {
  answerOf,
  endedBetween,
  requireBegun,
  startSettled,
  type CallSnapshot,
} from './conversation-answer';
import { conductOf } from './conversation-conduct';
import { ConversationDevices } from './conversation-devices';
import { conversationOf } from './conversation-look';
import { callRunning } from './conversation-room';
import type { ConversationSettingsStore } from './conversation-settings';
import type { ConversationEvent } from './conversation-types';
import type { ConversationActorRef } from './conversation.machine';
import type { ConversationsPort } from './conversations-port';
import type { ConversationProvider } from './provider';
import type { ConversationSessions } from './session-link';
import { noProviderReason, noConversation, unavailable } from './unavailable';
import { VoiceChoices } from './voice-choices';
import { VoiceClipDesk } from './voice-clip-desk';
import { VoicePreviews } from './voice-previews';

export type { ConversationsPort } from './conversations-port';

type CallStart = Extract<ConversationEvent, { type: 'call.start' }>;

/* The Conversation machine behind its Operations: the machine alone decides whether a start or an end may act. */
export class Conversations implements ConversationsPort {
  public readonly choices: VoiceChoices;
  public readonly devices = new ConversationDevices(
    () => this.snapshot().context.call?.connection ?? null,
  );
  private readonly previews = new VoicePreviews();
  public readonly previewClips: VoiceClipDesk;

  public constructor(
    private readonly actor: ConversationActorRef,
    store: ConversationSettingsStore,
    previewClipsDirectory: string,
  ) {
    this.choices = new VoiceChoices(store, () => this.provider());
    this.previewClips = new VoiceClipDesk(
      previewClipsDirectory,
      this.choices,
      () => this.provider(),
    );
  }

  public async status(): Promise<ConversationStatus> {
    return { ...this.current(), availability: await this.availability() };
  }

  private current(): ConversationUpdate {
    const snapshot = this.snapshot();
    const { ended, partials } = snapshot.context;
    const { volume, microphoneGain } = this.choices.options();

    return {
      conversation: conversationOf(snapshot),
      ended,
      partials,
      enabled: this.choices.enabled(),
      volume,
      microphoneGain,
    };
  }

  public async preview(input: VoicePreviewInput): Promise<VoicePreviewOutput> {
    await this.requireUsable();

    if (!this.snapshot().matches('idle')) throw callRunning();
    const previewed = await this.choices.previewed(input);

    return this.previews.play(this.provider(), input.offer, previewed);
  }

  public async start(
    input: ConversationStartInput,
    connection?: AbortSignal,
  ): Promise<ConversationStartOutput> {
    await this.requireStartable();
    connection?.throwIfAborted();
    this.previews.end();
    const event = await this.callStart(input, connection);
    const { conversationId } = event;
    this.actor.send(event);
    requireBegun(this.snapshot(), conversationId);
    this.devices.used(connection);

    return answerOf(await waitFor(this.actor, startSettled), conversationId);
  }

  public end(sessionId?: string): ConversationEndOutput {
    return {
      ended: this.ends({ type: 'call.end', reason: 'person', sessionId }),
    };
  }

  public hangUp(sessionId?: string): ConversationEndOutput {
    if (!this.ends({ type: 'call.end', reason: 'agent', sessionId }))
      throw noConversation();

    return { ended: true };
  }

  // Sends the end and answers whether the machine ended a call for it.
  private ends(end: Extract<ConversationEvent, { type: 'call.end' }>): boolean {
    const before = this.snapshot();
    this.actor.send(end);

    return endedBetween(before, this.snapshot());
  }

  // The machine's state now: the one place the call is read from.
  private snapshot(): CallSnapshot {
    return this.actor.getSnapshot();
  }

  public attach(sessions: ConversationSessions): void {
    this.actor.send({ type: 'sessions.attach', sessions });
  }

  public async *watch(
    signal: AbortSignal,
    connection?: Pick<RpcConnection, 'signal'>,
  ): AsyncGenerator<ConversationStatus> {
    for await (const update of this.updates(signal, connection)) {
      yield { ...update, availability: await this.availability() };
    }
  }

  public async *updates(
    signal: AbortSignal,
    connection?: Pick<RpcConnection, 'signal'>,
  ): AsyncGenerator<ConversationUpdate> {
    if (connection)
      this.actor.send({ type: 'call.appReconnect', signal: connection.signal });
    const changes = new Changes(this.actor, signal, this.choices);

    try {
      yield this.current();

      while (await changes.next()) yield this.current();
    } finally {
      changes.stop();
    }
  }

  private provider(): ConversationProvider | null {
    return this.snapshot().context.provider;
  }

  private async availability(): Promise<ConversationAvailability> {
    const provider = this.provider();

    return provider
      ? provider.availability()
      : { usable: false, reason: noProviderReason };
  }

  private async callStart(
    input: ConversationStartInput,
    connection?: AbortSignal,
  ): Promise<CallStart> {
    const setup = await this.choices.setup();

    return {
      type: 'call.start',
      conversationId: randomUUID(),
      ...input,
      setup,
      conduct: conductOf(this.choices.options()),
      connection,
    };
  }

  // Conversations are on and the provider can be used; the machine decides the rest when it is sent the start.
  private async requireStartable(): Promise<void> {
    if (!this.choices.enabled()) throw unavailable('Conversations are off');
    await this.requireUsable();
  }

  // The provider can start a call now, or what asked is refused.
  private async requireUsable(): Promise<void> {
    const availability = await this.availability();

    if (!availability.usable) throw unavailable(availability.reason);
  }
}
