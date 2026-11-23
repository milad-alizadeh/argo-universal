import type { SentPromptSender } from '@repo/contracts';
import type { operations } from '@repo/contracts/operations';
import { TRPCError } from '@trpc/server';
import type { z } from 'zod';
import type { WriterJob } from '../storage';
import { ScheduleTimers } from './schedule-machine';
import { recordScheduleSkip } from './schedule-skip';
import {
  ScheduleStore,
  type ManageSchedule,
  promptOf,
  type NewSchedule,
  type Schedule,
} from './schedule-store';
import { sendQueueCommand } from './sent-prompt/queue';
import { requireWritableSession } from './session-command';
import type { SessionActorRef } from './session-machine';
import type { SessionHandlerSources } from './session-sources';

export type CreateSchedule = z.output<
  (typeof operations)['session.schedulePrompt']['params']
>;

const second = 1000;

const oneDay = 86_400_000;

const lastDate = 8_640_000_000_000_000;

interface Delivery {
  prompt: Schedule['prompt'];
  deliveryWrite: WriterJob;
  coalescedWrite: WriterJob;
  at?: number;
  timeZone?: string;
}

/*
 * The one runner every Schedule fires through, whether it was made as a task in Scheduled or inside a
 * Session (ADR-0067). Each occurrence is a Prompt into the Schedule's own Session; it never starts another.
 */
export class Schedules {
  public readonly store: ScheduleStore;
  private readonly timers: ScheduleTimers;
  public constructor(
    private readonly sources: SessionHandlerSources,
    stopping?: AbortSignal,
  ) {
    this.store = new ScheduleStore(sources);

    this.timers = new ScheduleTimers(
      {
        nextAt: (id): number | undefined => this.store.deadline(id),
        deliver: (id, signal): Promise<void> => this.deliver(id, signal),
      },
      stopping,
    );

    for (const { id } of this.store.active()) this.timers.refresh(id);
  }
  public list(sessionId: string): Schedule[] {
    return this.store.list(sessionId);
  }
  // A Schedule made inside a Session: `session.schedulePrompt`.
  public create(input: CreateSchedule): Promise<Schedule> {
    requireWritableSession(this.sources.readSession(input.sessionId));
    const now = Date.now();
    const intervalSeconds = input.intervalSeconds ?? null;
    const nextAt = input.onceAt ?? now + (intervalSeconds ?? 0) * second;

    const endsAt =
      intervalSeconds === null ? null : (input.endsAt ?? now + oneDay);

    if (nextAt <= now || nextAt > lastDate)
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Choose a future delivery time',
      });

    if (endsAt !== null && endsAt <= nextAt)
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Choose an end time after the first occurrence',
      });

    return this.add({
      id: this.sources.createId(),
      sessionId: input.sessionId,
      prompt: input.prompt,
      cadence:
        intervalSeconds === null ? null : { type: 'interval', intervalSeconds },
      anchorAt: now,
      nextAt,
      endsAt,
      paused: false,
      task: null,
    });
  }
  public async add(
    schedule: NewSchedule,
    notice?: (write: WriterJob) => Promise<void>,
  ): Promise<Schedule> {
    const saved = await this.store.insert(schedule, notice);
    this.timers.refresh(saved.id);

    return saved;
  }
  public async manage(input: ManageSchedule): Promise<Record<string, never>> {
    await this.store.change(input);
    this.timers.refresh(input.id);

    return {};
  }
  public refresh(id: string): void {
    this.timers.refresh(id);
  }
  // Sends the Schedule's Prompt now through the same queue an occurrence uses.
  public async runNow(id: string, signal?: AbortSignal): Promise<string> {
    const row = this.store.row(id);

    if (!row)
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Schedule not found' });

    requireWritableSession(this.sources.readSession(row.sessionId));
    const write = this.store.sentNow(id);
    const session = await this.open(row.sessionId, signal);

    await this.enqueue(session, id, {
      prompt: promptOf(row),
      deliveryWrite: write,
      coalescedWrite: write,
    });

    return row.sessionId;
  }
  private async deliver(id: string, signal: AbortSignal): Promise<void> {
    const due = this.store.occurrence(id);

    if (!due) return;

    const { sessionId } = due;

    if (this.sources.readSession(sessionId).archivedAt !== null) {
      await this.manage({ sessionId, id, action: 'pause' });

      return;
    }

    await (due.late
      ? recordScheduleSkip(this.sources, {
          ...due,
          scheduleId: id,
          reason: 'offline',
          advance: due.skipWrite,
        })
      : this.deliverDue(id, sessionId, signal));
  }
  private async deliverDue(
    id: string,
    sessionId: string,
    signal: AbortSignal,
  ): Promise<void> {
    const session = await this.open(sessionId, signal);

    signal.throwIfAborted();
    // Read again: the Schedule may have changed, or passed the grace window, while the Session opened.
    const occurrence = this.store.occurrence(id);

    if (!occurrence) return;

    await (occurrence.late
      ? recordScheduleSkip(this.sources, {
          ...occurrence,
          scheduleId: id,
          reason: 'offline',
          advance: occurrence.skipWrite,
        })
      : this.enqueue(session, id, occurrence));
  }
  private open(
    sessionId: string,
    signal?: AbortSignal,
  ): Promise<SessionActorRef> {
    return this.sources.open.ready(sessionId, 'session.queue', signal);
  }
  // A busy Session queues the Prompt; one already waiting from this Schedule absorbs the next (no backlog).
  private async enqueue(
    session: SessionActorRef,
    id: string,
    { prompt, deliveryWrite, coalescedWrite, at, timeZone }: Delivery,
  ): Promise<void> {
    const waiting = session
      .getSnapshot()
      .context.promptQueue.items.some(
        ({ sender }) => sender?.type === 'schedule' && sender.scheduleId === id,
      );

    if (waiting) {
      return at === undefined
        ? this.sources.open.write(coalescedWrite)
        : recordScheduleSkip(this.sources, {
            scheduleId: id,
            sessionId: session.getSnapshot().context.sessionId,
            at,
            timeZone,
            reason: 'waiting',
            advance: coalescedWrite,
          });
    }

    await sendQueueCommand(session, {
      command: { action: 'append', prompt },
      sender: scheduleSender(id),
      queuedId: this.sources.createId(),
      commitWith: deliveryWrite,
    });
  }
}

export const scheduleSender = (
  scheduleId: string,
): Extract<SentPromptSender, { type: 'schedule' }> => ({
  type: 'schedule',
  title: 'Schedule',
  scheduleId,
});
