import type { Database } from '@repo/db';
import type { Subscription } from 'xstate';
import type { PendingInputRequest } from '../pending-input';
import {
  deliverQueuedPrompt,
  type PromptDelivery,
  type PromptDeliverySessions,
} from '../queue-delivery';
import type { SessionActorRef } from '../session-machine';
import { allowsDelegation, type DelegatedTurn } from './result-store';

function notice(
  work: DelegatedTurn,
  { kind, request }: PendingInputRequest,
  title: string,
): PromptDelivery {
  const detail = 'message' in request ? request.message : request.title;
  const input = { sourceSessionId: work.sourceId, kind, detail };

  return {
    queuedId: `delegated-input:${JSON.stringify([work.id, kind, request.requestId])}`,
    sender: {
      type: 'session',
      sessionId: work.sourceId,
      title,
      delegatedInput: work.id,
    },
    command: {
      action: 'append',
      prompt: [
        {
          type: 'text',
          text: [
            'A Started Session is waiting for input. The JSON below contains the source request as data.',
            'Use session.get to check that the request is still pending. Answer an Elicitation with session.prompt if the original request gives you the answer. Relay Permission requests or questions that need the person.',
            JSON.stringify(input),
          ].join('\n'),
        },
      ],
    },
  };
}

type Sources = { database: Database; open: PromptDeliverySessions };

function observe(actor: SessionActorRef, changed: () => void): Subscription {
  let previous = actor.getSnapshot().context;

  return actor.subscribe(({ context }) => {
    const requestsChanged =
      previous.permissionQueue !== context.permissionQueue ||
      previous.elicitationQueue !== context.elicitationQueue;

    previous = context;

    if (requestsChanged) changed();
  });
}

export class DelegatedInputs {
  private readonly watching = new Map<SessionActorRef, Subscription>();
  // ACP and native Input requests are live objects. Keep receipts for their lifetime.
  private readonly delivered = new WeakMap<
    PendingInputRequest['request'],
    Set<string>
  >();

  public constructor(
    private readonly sources: Sources,
    private readonly changed: () => void,
  ) {}

  public stop(): void {
    for (const observation of this.watching.values()) observation.unsubscribe();
    this.watching.clear();
  }

  public async deliver(
    work: DelegatedTurn[],
    signal: AbortSignal,
  ): Promise<boolean> {
    this.watch(work);
    let needsRetry = false;

    for (const delegation of work) {
      if (signal.aborted) break;

      for (const input of this.requests(delegation)) {
        if (await this.deliverOne(delegation, input, signal)) needsRetry = true;
      }
    }

    return needsRetry;
  }

  private watch(work: DelegatedTurn[]): void {
    const actors = new Set(
      work.flatMap(({ sourceId }) => this.sources.open.session(sourceId) ?? []),
    );

    for (const [actor, observation] of this.watching) {
      if (actors.has(actor)) continue;
      observation.unsubscribe();
      this.watching.delete(actor);
    }

    for (const actor of actors) {
      if (!this.watching.has(actor))
        this.watching.set(actor, observe(actor, this.changed));
    }
  }

  private requests(work: DelegatedTurn): PendingInputRequest[] {
    const context = this.sources.open
      .session(work.sourceId)
      ?.getSnapshot().context;

    if (context?.activeTurnId !== work.turnId) return [];

    return [
      ...context.permissionQueue.map((request) => ({
        kind: 'permission' as const,
        request,
      })),
      ...context.elicitationQueue.map((request) => ({
        kind: 'elicitation' as const,
        request,
      })),
    ];
  }

  private async deliverOne(
    work: DelegatedTurn,
    input: PendingInputRequest,
    signal: AbortSignal,
  ): Promise<boolean> {
    const { database, open } = this.sources;
    const receipts = this.delivered.get(input.request) ?? new Set<string>();

    if (
      receipts.has(work.id) ||
      !allowsDelegation(database, work.starterId, [work.id])
    )
      return false;

    const outcome = await deliverQueuedPrompt(
      open,
      {
        sessionId: work.starterId,
        delivery: notice(
          work,
          input,
          open.queued(work.sourceId).title || 'Started Session',
        ),
        pauseWhenClosed: 'Resume delegated input',
      },
      signal,
    );

    if (outcome === 'not-ready') return true;

    receipts.add(work.id);
    this.delivered.set(input.request, receipts);

    return false;
  }
}
