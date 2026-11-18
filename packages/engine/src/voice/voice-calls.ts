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
import type { EndedCall, RunningCall } from './call-types';
import type { VoiceCallActorRef, voiceCallMachine } from './call.machine';
import { Changes } from './changes';
import type { VoiceSessions } from './session-link';
import { unavailable } from './unavailable';

type CallSnapshot = SnapshotFrom<typeof voiceCallMachine>;

// What the App and Operations ask of the Voice call: start it, end it, read it, watch it.
export interface VoiceCallsPort {
  status: () => Promise<VoiceStatus>;
  start: (
    input: VoiceStartInput,
    connection?: AbortSignal,
  ) => Promise<VoiceStartOutput>;
  end: (sessionId?: string) => VoiceEndOutput;
  // An Agent ends its Session's call; refused when the Session has no call.
  hangUp: (sessionId?: string) => VoiceEndOutput;
  watch: (signal: AbortSignal) => AsyncGenerator<VoiceStatus>;
  // Gives the call the Sessions it sends Prompts to and listens to.
  attach: (sessions: VoiceSessions) => void;
}

const namesSession = (
  sessionId: string | undefined,
  call: RunningCall,
): boolean => sessionId === undefined || sessionId === call.sessionId;

// The Voice call machine behind its Operations: it checks what can be refused before the machine is asked.
export class VoiceCalls implements VoiceCallsPort {
  public constructor(private readonly actor: VoiceCallActorRef) {}

  public async status(): Promise<VoiceStatus> {
    const { call, ended, partials } = this.actor.getSnapshot().context;

    return {
      call: call && this.callOf(call),
      ended,
      partials,
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

    if (!call || !namesSession(sessionId, call))
      throw unavailable('The Session has no Voice call');

    return call;
  }

  public attach(sessions: VoiceSessions): void {
    this.actor.getSnapshot().context.sessions.attach(sessions);
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

  private callOf({
    callId,
    sessionId,
    limit,
  }: RunningCall): NonNullable<VoiceStatus['call']> {
    const status = this.actor.getSnapshot().matches({ running: 'connected' })
      ? 'connected'
      : 'connecting';

    return limit
      ? { callId, sessionId, status, limit }
      : { callId, sessionId, status };
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
