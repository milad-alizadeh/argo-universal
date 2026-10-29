import type { CoreHooks } from '@repo/contracts/plugins';
import type { Database } from '@repo/db';
import { TRPCError } from '@trpc/server';
import type { Observer, Subscription } from 'xstate';
import type { AcpResources, InstalledAgents } from '../agents';
import { writeDatabaseJobAndWaitForCommit, type WriterJob } from '../storage';
import type {
  OpenSessionsActorRef,
  OpenSessionsCommand,
} from './open-sessions-machine';
import {
  requireWritableSession,
  type ReadySessionCommandType,
  waitForReadySession,
} from './session-command';
import type { SessionContext } from './session-context';
import type { SessionActorRef } from './session-machine';
import { createQueuedSessionReader } from './session-record';
import type { SessionSources } from './session-sources';

type SessionOpening = Exclude<
  OpenSessionsCommand,
  { type: 'sessions.stopAll' }
>;

type QueuedSession = ReturnType<ReturnType<typeof createQueuedSessionReader>>;

/*
 * The Engine's open Sessions as a thin Session handler reaches them (ADR-0016 §10): it admits a command,
 * finds or opens the Session's actor, and reads and writes the Session's row. Readiness is asked of the
 * Session statechart's tags, never of its state names.
 */
export class OpenSessions {
  public readonly database: Database;
  public readonly readSession: SessionSources['readSession'];
  public readonly findFeed: SessionSources['findFeed'];
  public readonly findWriter: SessionSources['findWriter'];
  public readonly createId: () => string;
  public readonly installedAgents: InstalledAgents;
  public readonly hooks: CoreHooks;
  private readonly actor: OpenSessionsActorRef;
  private readonly stopping: AbortSignal | undefined;
  public constructor(sources: SessionSources) {
    this.database = sources.database;
    this.readSession = sources.readSession;
    this.findFeed = sources.findFeed;
    this.findWriter = sources.findWriter;
    this.createId = sources.createId;
    this.installedAgents = sources.installedAgents;
    this.hooks = sources.hooks;
    this.actor = sources.sessions;
    this.stopping = sources.sessionCommandSignal;
  }
  // A Session command is accepted while the Engine and its caller wait for it and the open Sessions admit it.
  public admit(signal?: AbortSignal): void {
    if (anyAborted(this.stopping, signal))
      throw conflict('The Engine is stopping');

    if (!admitting(this.actor)) throw this.refusal('commands');
  }
  // The Session's actor once it may take the command; a Session that is not open opens from storage first.
  public async ready(
    sessionId: string,
    commandType: ReadySessionCommandType = 'session.prompt',
    signal?: AbortSignal,
  ): Promise<SessionActorRef> {
    this.admit(signal);

    return waitForReadySession(
      this.session(sessionId) ?? this.openStored(sessionId),
      commandType,
    );
  }
  // The Session's actor while it runs; a stopped one waits in the open Sessions only until they drop it.
  public session(sessionId: string): SessionActorRef | undefined {
    const actor = this.actor.getSnapshot().context.sessions[sessionId];

    return actor?.getSnapshot().status === 'active' ? actor : undefined;
  }
  public context(sessionId: string): SessionContext | undefined {
    return this.session(sessionId)?.getSnapshot().context;
  }
  public live(sessionId: string): SessionActorRef {
    return (
      this.session(sessionId) ?? fail('NOT_FOUND', `No Session ${sessionId}`)
    );
  }
  // Sends an opening the open Sessions machine accepts now, and returns the Session actor it opened.
  public open(command: SessionOpening): SessionActorRef {
    if (!this.actor.getSnapshot().can(command))
      throw this.refusal(command.type);
    this.actor.send(command);

    return (
      this.session(command.sessionId) ??
      fail('INTERNAL_SERVER_ERROR', `Session ${command.sessionId} did not open`)
    );
  }
  public subscribe(observer: Observer<unknown>): Subscription {
    return this.actor.subscribe(observer);
  }
  public get acpResources(): AcpResources {
    return this.actor.getSnapshot().context.acpResources;
  }
  // The Session's row as the Writer will leave it: its queued jobs replayed over the stored row.
  public queued(sessionId: string): QueuedSession {
    return createQueuedSessionReader(this)(sessionId);
  }
  public async write(job: WriterJob): Promise<void> {
    const writer =
      this.findWriter() ??
      fail('INTERNAL_SERVER_ERROR', 'Database Writer is not available');

    await writeDatabaseJobAndWaitForCommit(writer, job);
  }
  private openStored(sessionId: string): SessionActorRef {
    const { agent } = requireWritableSession(this.readSession(sessionId));

    return this.open({ type: 'sessions.open', sessionId, agent });
  }
  private refusal(commandType: string): TRPCError {
    return conflict(
      `The open Sessions machine cannot accept ${commandType} in ${JSON.stringify(this.actor.getSnapshot().value)}`,
    );
  }
}

const anyAborted = (...signals: (AbortSignal | undefined)[]): boolean =>
  signals.some((signal) => signal?.aborted === true);

const admitting = (actor: OpenSessionsActorRef): boolean => {
  const snapshot = actor.getSnapshot();

  return snapshot.status === 'active' && snapshot.hasTag('admitting');
};

const conflict = (message: string): TRPCError =>
  new TRPCError({ code: 'CONFLICT', message });

const fail = (code: TRPCError['code'], message: string): never => {
  throw new TRPCError({ code, message });
};
