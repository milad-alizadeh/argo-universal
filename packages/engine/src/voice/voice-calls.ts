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
import { waitFor, type SnapshotFrom } from 'xstate';
import { sessionActorId } from '../sessions';
import type { EndedCall } from './call-types';
import type { VoiceCallActorRef, voiceCallMachine } from './call.machine';
import { Changes } from './changes';
import type { VoiceProvider } from './provider';
import type { VoiceSessions } from './session-link';
import { changedSettings, settingsOf, voiceChosen } from './voice-choices';
import type { VoiceSettingsStore } from './voice-settings';

type CallSnapshot = SnapshotFrom<typeof voiceCallMachine>;

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

const unavailable = (message: string): TRPCError =>
  new TRPCError({ code: 'PRECONDITION_FAILED', message });

// The Voice call machine behind its Operations: it checks what can be refused before the machine is asked.
export class VoiceCalls implements VoiceCallsPort {
  public constructor(
    private readonly actor: VoiceCallActorRef,
    private readonly store: VoiceSettingsStore,
  ) {}

  private readonly listeners = new Set<() => void>();

  public listen(listener: () => void): () => void {
    this.listeners.add(listener);

    return () => this.listeners.delete(listener);
  }

  public async status(): Promise<VoiceStatus> {
    const { call, ended } = this.actor.getSnapshot().context;

    return {
      call: call && this.callOf(call.callId, call.sessionId),
      ended,
      availability: await this.availability(),
      enabled: this.store.read().enabled,
    };
  }

  public settings(): Promise<VoiceSettings> {
    return settingsOf(this.store.read(), this.provider());
  }

  public async changeSettings(
    change: VoiceSettingsChange,
  ): Promise<VoiceSettings> {
    const changed = await changedSettings(
      this.store.read(),
      change,
      this.provider(),
    );
    await this.store.write(changed);
    for (const listener of this.listeners) listener();

    return this.settings();
  }

  public async start(
    input: VoiceStartInput,
    connection?: AbortSignal,
  ): Promise<VoiceStartOutput> {
    if (!this.store.read().enabled) throw unavailable('Voice calls are off');
    const availability = await this.availability();

    if (!availability.usable) throw unavailable(availability.reason);
    this.requireRoom(input.sessionId);
    connection?.throwIfAborted();
    const callId = randomUUID();
    const voice = await this.voice();
    this.actor.send({ type: 'call.start', callId, ...input, voice, connection });
    const settled = await waitFor(this.actor, startSettled);

    return answerOf(settled, callId);
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
    const changes = new Changes(this.actor, signal, this);

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

  // The voice the next call speaks with: the one chosen, else the provider's first.
  private async voice(): Promise<string | undefined> {
    const voices = (await this.provider()?.voices()) ?? [];

    return voiceChosen(this.store.read().voice, voices) ?? undefined;
  }

  private async availability(): Promise<VoiceAvailability> {
    const provider = this.provider();

    return provider
      ? provider.availability()
      : { usable: false, reason: 'No Voice provider is configured' };
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

// The start has settled once the provider answered or the call is over.
const startSettled = (snapshot: CallSnapshot): boolean =>
  snapshot.matches('idle') || snapshot.context.call?.answer != null;

const answerOfCall = (snapshot: CallSnapshot, callId: string): string | null =>
  snapshot.context.call?.callId === callId
    ? snapshot.context.call.answer
    : null;

const endedMessage = (ended: EndedCall | null): string =>
  ended
    ? `The Voice call ended: ${ended.reason}`
    : 'The Voice call failed to start';

// Why a start that settled without an answer did not get one.
const failureOf = ({ context }: CallSnapshot): string =>
  context.failure ?? endedMessage(context.ended);

function answerOf(snapshot: CallSnapshot, callId: string): VoiceStartOutput {
  const answer = answerOfCall(snapshot, callId);

  if (answer !== null) return { callId, answer };

  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: failureOf(snapshot),
  });
}

const noStatus: VoiceStatus = {
  call: null,
  ended: null,
  availability: { usable: false, reason: 'Voice calls are not available' },
  enabled: true,
};

// What the Server runs with when it was given no Voice call machine: a Voice call can never start.
export const noVoiceCalls: VoiceCallsPort = {
  status: () => Promise.resolve(noStatus),
  start: () => Promise.reject(unavailable('Voice calls are not available')),
  end: () => ({ ended: false }),
  attach: () => {},
  settings: () =>
    Promise.resolve({
      enabled: true,
      provider: null,
      voice: null,
      providers: [],
      voices: [],
    }),
  changeSettings: () =>
    Promise.reject(unavailable('Voice calls are not available')),
  watch: async function* () {
    await Promise.resolve();
    yield noStatus;
  },
};
