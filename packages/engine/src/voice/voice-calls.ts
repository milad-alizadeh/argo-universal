import { randomUUID } from 'node:crypto';
import type {
  VoiceAvailability,
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
}

const unavailable = (message: string): TRPCError =>
  new TRPCError({ code: 'PRECONDITION_FAILED', message });

// The Voice call machine behind its Operations: it checks what can be refused before the machine is asked.
export class VoiceCalls implements VoiceCallsPort {
  public constructor(private readonly actor: VoiceCallActorRef) {}

  public async status(): Promise<VoiceStatus> {
    const { call, ended } = this.actor.getSnapshot().context;

    return {
      call: call && this.callOf(call.callId, call.sessionId),
      ended,
      availability: await this.availability(),
    };
  }

  public async start(
    input: VoiceStartInput,
    connection?: AbortSignal,
  ): Promise<VoiceStartOutput> {
    const availability = await this.availability();

    if (!availability.usable) throw unavailable(availability.reason);
    this.requireRoom(input.sessionId);
    connection?.throwIfAborted();
    const callId = randomUUID();
    this.actor.send({ type: 'call.start', callId, ...input, connection });
    const settled = await waitFor(this.actor, startSettled);

    return answerOf(settled, callId);
  }

  public end(sessionId?: string): VoiceEndOutput {
    const running = this.actor.getSnapshot().context.call !== null;
    this.actor.send({ type: 'call.end', reason: 'person', sessionId });

    return { ended: running && this.actor.getSnapshot().context.call === null };
  }

  public async *watch(signal: AbortSignal): AsyncGenerator<VoiceStatus> {
    const changes = new Changes(this.actor, signal);

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

  private async availability(): Promise<VoiceAvailability> {
    const { provider } = this.actor.getSnapshot().context;

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
};

// What the Server runs with when it was given no Voice call machine: a Voice call can never start.
export const noVoiceCalls: VoiceCallsPort = {
  status: () => Promise.resolve(noStatus),
  start: () => Promise.reject(unavailable('Voice calls are not available')),
  end: () => ({ ended: false }),
  watch: async function* () {
    await Promise.resolve();
    yield noStatus;
  },
};
