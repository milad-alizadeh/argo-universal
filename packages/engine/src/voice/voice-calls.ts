import { randomUUID } from 'node:crypto';
import type {
  VoiceAvailability,
  VoiceSettings,
  VoiceSettingsChange,
  VoiceEndOutput,
  VoiceStartInput,
  VoiceStartOutput,
  VoiceStatus,
} from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import { waitFor } from 'xstate';
import { sessionActorId } from '../sessions';
import type { VoiceCallEvent } from './call-types';
import type { VoiceCallActorRef } from './call.machine';
import { Changes } from './changes';
import type { VoiceProvider } from './provider';
import type { VoiceSessions } from './session-link';
import { answerOf, startSettled } from './voice-call-answer';
import { VoiceChoices } from './voice-choices';
import type { VoiceSettingsStore } from './voice-settings';

type CallStart = Extract<VoiceCallEvent, { type: 'call.start' }>;

// What the App and Operations ask of the Voice call: start it, end it, read it, watch it.
export interface VoiceCallsPort {
  status: () => Promise<VoiceStatus>;
  start: (
    input: VoiceStartInput,
    connection?: AbortSignal,
  ) => Promise<VoiceStartOutput>;
  end: (sessionId?: string) => VoiceEndOutput;
  watch: (signal: AbortSignal) => AsyncGenerator<VoiceStatus>;
  // Gives the call the Sessions it sends Prompts to and listens to.
  attach: (sessions: VoiceSessions) => void;
  // Settings › Voice: what the person chose and can choose from, and changing it.
  settings: () => Promise<VoiceSettings>;
  changeSettings: (change: VoiceSettingsChange) => Promise<VoiceSettings>;
}

export const unavailable = (message: string): TRPCError =>
  new TRPCError({ code: 'PRECONDITION_FAILED', message });

// The Voice call machine behind its Operations: it checks what can be refused before the machine is asked.
export class VoiceCalls implements VoiceCallsPort {
  private readonly choices: VoiceChoices;

  public constructor(
    private readonly actor: VoiceCallActorRef,
    store: VoiceSettingsStore,
  ) {
    this.choices = new VoiceChoices(store, () => this.provider());
  }

  public async status(): Promise<VoiceStatus> {
    const { call, ended, partials } = this.actor.getSnapshot().context;

    return {
      call: call && this.callOf(call.callId, call.sessionId),
      ended,
      partials,
      availability: await this.availability(),
      enabled: this.choices.enabled(),
    };
  }

  public settings(): Promise<VoiceSettings> {
    return this.choices.settings();
  }

  public changeSettings(change: VoiceSettingsChange): Promise<VoiceSettings> {
    return this.choices.change(change);
  }

  public async start(
    input: VoiceStartInput,
    connection?: AbortSignal,
  ): Promise<VoiceStartOutput> {
    await this.requireStartable(input.sessionId);
    connection?.throwIfAborted();
    const event = await this.callStart(input, connection);
    this.actor.send(event);

    return answerOf(await waitFor(this.actor, startSettled), event.callId);
  }

  public end(sessionId?: string): VoiceEndOutput {
    const running = this.actor.getSnapshot().context.call !== null;
    this.actor.send({ type: 'call.end', reason: 'person', sessionId });

    return { ended: running && this.actor.getSnapshot().context.call === null };
  }

  public attach(sessions: VoiceSessions): void {
    this.actor.getSnapshot().context.sessions.attach(sessions);
  }

  public async *watch(signal: AbortSignal): AsyncGenerator<VoiceStatus> {
    const changes = new Changes(this.actor, signal, this.choices);

    try {
      yield await this.status();

      while (await changes.next()) yield await this.status();
    } finally {
      changes.stop();
    }
  }

  private callOf(
    callId: string,
    sessionId: string,
  ): NonNullable<VoiceStatus['call']> {
    const status = this.actor.getSnapshot().matches({ running: 'connected' })
      ? 'connected'
      : 'connecting';

    return { callId, sessionId, status };
  }

  private provider(): VoiceProvider | null {
    return this.actor.getSnapshot().context.provider;
  }

  private async availability(): Promise<VoiceAvailability> {
    const provider = this.provider();

    return provider
      ? provider.availability()
      : { usable: false, reason: 'No Voice provider is configured' };
  }

  private async callStart(
    input: VoiceStartInput,
    connection?: AbortSignal,
  ): Promise<CallStart> {
    const voice = await this.choices.voice();

    return {
      type: 'call.start',
      callId: randomUUID(),
      ...input,
      voice,
      connection,
    };
  }

  // Voice calls are on, the provider can be used, and there is room for a call in this Session.
  private async requireStartable(sessionId: string): Promise<void> {
    if (!this.choices.enabled()) throw unavailable('Voice calls are off');
    const availability = await this.availability();

    if (!availability.usable) throw unavailable(availability.reason);
    this.requireRoom(sessionId);
  }

  private requireRoom(sessionId: string): void {
    if (!this.actor.getSnapshot().matches('idle'))
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'A Voice call is already running',
      });

    if (!this.actor.system.get(sessionActorId(sessionId)))
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'The Session is not open',
      });
  }
}
