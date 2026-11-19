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
import type { VoiceCallEvent } from './call-types';
import type { VoiceCallActorRef } from './call.machine';
import { Changes } from './changes';
import type { VoiceProvider } from './provider';
import type { VoiceSessions } from './session-link';
import { noProviderReason, noVoiceCall, unavailable } from './unavailable';
import {
  answerOf,
  endedBetween,
  requireBegun,
  startSettled,
  type CallSnapshot,
} from './voice-call-answer';
import { callRunning } from './voice-call-room';
import type { VoiceCallsPort } from './voice-calls-port';
import { VoiceChoices } from './voice-choices';
import { VoiceClipDesk } from './voice-clip-desk';
import { VoiceDevices } from './voice-devices';
import { VoicePreviews } from './voice-previews';
import type { VoiceSettingsStore } from './voice-settings';

export type { VoiceCallsPort } from './voice-calls-port';

type CallStart = Extract<VoiceCallEvent, { type: 'call.start' }>;

type CallEnd = Extract<VoiceCallEvent, { type: 'call.end' }>;

/*
 * The Voice call machine behind its Operations. Whether Voice calls are on and the provider is usable are asked here;
 * whether a start or an end may act on the call, and why not, the machine alone decides when it is sent one.
 */
export class VoiceCalls implements VoiceCallsPort {
  public readonly choices: VoiceChoices;
  public readonly devices = new VoiceDevices(
    () => this.snapshot().context.call?.connection ?? null,
  );
  private readonly previews = new VoicePreviews();
  public readonly previewClips: VoiceClipDesk;

  public constructor(
    private readonly actor: VoiceCallActorRef,
    store: VoiceSettingsStore,
    previewClipsDirectory: string,
  ) {
    this.choices = new VoiceChoices(store, () => this.provider());
    this.previewClips = new VoiceClipDesk(
      previewClipsDirectory,
      this.choices,
      () => this.provider(),
    );
  }

  public async status(): Promise<VoiceStatus> {
    const snapshot = this.snapshot();
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

    if (!this.snapshot().matches('idle')) throw callRunning();
    const previewed = await this.choices.previewed(input);

    return this.previews.play(this.provider(), input.offer, previewed);
  }

  public async start(
    input: VoiceStartInput,
    connection?: AbortSignal,
  ): Promise<VoiceStartOutput> {
    await this.requireStartable();
    connection?.throwIfAborted();
    this.previews.end();
    const event = await this.callStart(input, connection);
    this.actor.send(event);
    requireBegun(this.snapshot(), event.callId);
    this.devices.used(connection);

    return answerOf(await waitFor(this.actor, startSettled), event.callId);
  }

  public end(sessionId?: string): VoiceEndOutput {
    return {
      ended: this.ends({ type: 'call.end', reason: 'person', sessionId }),
    };
  }

  public hangUp(sessionId?: string): VoiceEndOutput {
    if (!this.ends({ type: 'call.end', reason: 'agent', sessionId }))
      throw noVoiceCall();

    return { ended: true };
  }

  // Sends the end and answers whether the machine ended a call for it.
  private ends(end: CallEnd): boolean {
    const before = this.snapshot();
    this.actor.send(end);

    return endedBetween(before, this.snapshot());
  }

  // The machine's state now: the one place the call is read from.
  private snapshot(): CallSnapshot {
    return this.actor.getSnapshot();
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
    return this.snapshot().context.provider;
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

  // Voice calls are on and the provider can be used; the machine decides the rest when it is sent the start.
  private async requireStartable(): Promise<void> {
    if (!this.choices.enabled()) throw unavailable('Voice calls are off');
    await this.requireUsable();
  }

  // The provider can start a call now, or what asked is refused.
  private async requireUsable(): Promise<void> {
    const availability = await this.availability();

    if (!availability.usable) throw unavailable(availability.reason);
  }
}
