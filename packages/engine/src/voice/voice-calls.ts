import { randomUUID } from 'node:crypto';
import type {
  VoiceAvailability,
  VoiceEndOutput,
  VoicePreviewInput,
  VoicePreviewOutput,
  VoiceStartInput,
  VoiceStartOutput,
  VoiceStatus,
} from '@repo/contracts';
import { waitFor } from 'xstate';
import { conductOf } from './call-conduct';
import { voiceCallOf } from './call-look';
import type { RunningCall, VoiceCallEvent } from './call-types';
import type { VoiceCallActorRef } from './call.machine';
import { Changes } from './changes';
import type { VoiceProvider } from './provider';
import type { VoiceSessions } from './session-link';
import { noProviderReason, noVoiceCall, unavailable } from './unavailable';
import { answerOf, startSettled } from './voice-call-answer';
import { requireNoCall, requireRoom } from './voice-call-room';
import type { VoiceCallsPort } from './voice-calls-port';
import { VoiceChoices } from './voice-choices';
import { VoiceDevices } from './voice-devices';
import { VoicePreviews } from './voice-previews';
import type { VoiceSettingsStore } from './voice-settings';

export type { VoiceCallsPort } from './voice-calls-port';

type CallStart = Extract<VoiceCallEvent, { type: 'call.start' }>;

const namesSession = (
  sessionId: string | undefined,
  call: RunningCall,
): boolean => sessionId === undefined || sessionId === call.sessionId;

// The Voice call machine behind its Operations: it checks what can be refused before the machine is asked.
export class VoiceCalls implements VoiceCallsPort {
  public readonly choices: VoiceChoices;
  public readonly devices = new VoiceDevices(
    () => this.actor.getSnapshot().context.call?.connection ?? null,
  );
  private readonly previews = new VoicePreviews();

  public constructor(
    private readonly actor: VoiceCallActorRef,
    store: VoiceSettingsStore,
  ) {
    this.choices = new VoiceChoices(store, () => this.provider());
  }

  public async status(): Promise<VoiceStatus> {
    const snapshot = this.actor.getSnapshot();
    const { ended, partials } = snapshot.context;
    const { volume, microphoneGain } = this.choices.options();

    return {
      call: voiceCallOf(snapshot),
      ended,
      partials,
      availability: await this.availability(),
      enabled: this.choices.enabled(),
      volume,
      microphoneGain,
    };
  }

  public async preview(input: VoicePreviewInput): Promise<VoicePreviewOutput> {
    await this.requireUsable();
    requireNoCall(this.actor);
    const previewed = await this.choices.previewed(input);

    return this.previews.play(this.provider(), input.offer, previewed);
  }

  public async start(
    input: VoiceStartInput,
    connection?: AbortSignal,
  ): Promise<VoiceStartOutput> {
    await this.requireStartable(input.sessionId);
    connection?.throwIfAborted();
    this.previews.end();
    this.devices.used(connection);
    const event = await this.callStart(input, connection);
    this.actor.send(event);

    return answerOf(await waitFor(this.actor, startSettled), event.callId);
  }

  public end(sessionId?: string): VoiceEndOutput {
    const running = this.actor.getSnapshot().context.call !== null;
    this.actor.send({ type: 'call.end', reason: 'person', sessionId });

    return { ended: running && this.actor.getSnapshot().context.call === null };
  }

  public hangUp(sessionId?: string): VoiceEndOutput {
    const call = this.callOfSession(sessionId);

    this.actor.send({
      type: 'call.end',
      reason: 'agent',
      sessionId: call.sessionId,
    });

    return { ended: this.actor.getSnapshot().context.call === null };
  }

  // The running call of the Session, or a refusal when the Session has none.
  private callOfSession(sessionId?: string): RunningCall {
    const { call } = this.actor.getSnapshot().context;

    if (!call || !namesSession(sessionId, call)) throw noVoiceCall();

    return call;
  }

  public attach(sessions: VoiceSessions): void {
    this.actor.send({ type: 'sessions.attach', sessions });
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

  private provider(): VoiceProvider | null {
    return this.actor.getSnapshot().context.provider;
  }

  private async availability(): Promise<VoiceAvailability> {
    const provider = this.provider();

    return provider
      ? provider.availability()
      : { usable: false, reason: noProviderReason };
  }

  private async callStart(
    input: VoiceStartInput,
    connection?: AbortSignal,
  ): Promise<CallStart> {
    const setup = await this.choices.setup();

    return {
      type: 'call.start',
      callId: randomUUID(),
      ...input,
      setup,
      conduct: conductOf(this.choices.options()),
      connection,
    };
  }

  // Voice calls are on, the provider can be used, and there is room for a call in this Session.
  private async requireStartable(sessionId: string): Promise<void> {
    if (!this.choices.enabled()) throw unavailable('Voice calls are off');
    await this.requireUsable();
    requireRoom(this.actor, sessionId);
  }

  // The provider can start a call now, or what asked is refused.
  private async requireUsable(): Promise<void> {
    const availability = await this.availability();

    if (!availability.usable) throw unavailable(availability.reason);
  }
}
