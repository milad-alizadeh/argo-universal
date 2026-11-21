import type { SentPromptSender } from '@repo/contracts';
import { ScheduleTimers } from './schedule-machine';
import {
  ScheduleStore,
  type Schedule,
  type ScheduleOccurrence,
  type CreateSchedule,
  type ManageSchedule,
} from './schedule-store';
import { sendQueueCommand } from './sent-prompt/queue';
import { requireWritableSession } from './session-command';
import type { SessionActorRef } from './session-machine';
import type { SessionHandlerSources } from './session-sources';

export class Schedules {
  private readonly timers: ScheduleTimers;
  private readonly store: ScheduleStore;
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
  public async create(input: CreateSchedule): Promise<Schedule> {
    requireWritableSession(this.sources.readSession(input.sessionId));
    const schedule = await this.store.insert(input);
    this.timers.refresh(schedule.id);

    return schedule;
  }
  public async manage(input: ManageSchedule): Promise<Record<string, never>> {
    await this.store.change(input);
    this.timers.refresh(input.id);

    return {};
  }
  private async deliver(id: string, signal: AbortSignal): Promise<void> {
    const occurrenceBeforeOpen = this.store.occurrence(id);

    if (!occurrenceBeforeOpen) return;

    const { sessionId } = occurrenceBeforeOpen;

    if (this.sources.readSession(sessionId).archivedAt !== null) {
      await this.manage({ sessionId, id, action: 'pause' });

      return;
    }

    const session = await this.sources.open.ready(
      sessionId,
      'session.queue',
      signal,
    );

    signal.throwIfAborted();
    const occurrence = this.store.occurrence(id);

    if (occurrence) await this.enqueue(session, id, occurrence);
  }
  private async enqueue(
    session: SessionActorRef,
    id: string,
    { prompt, deliveryWrite, coalescedWrite }: ScheduleOccurrence,
  ): Promise<void> {
    const waiting = session
      .getSnapshot()
      .context.promptQueue.items.some(
        ({ sender }) => sender?.type === 'schedule' && sender.scheduleId === id,
      );

    if (waiting) {
      await this.sources.open.write(coalescedWrite);

      return;
    }

    const sender = scheduleSender(id);
    const queuedId = this.sources.createId();
    const command = { action: 'append', prompt } as const;
    await sendQueueCommand(session, {
      command,
      sender,
      queuedId,
      commitWith: deliveryWrite,
    });
  }
}

const scheduleSender = (
  scheduleId: string,
): Extract<SentPromptSender, { type: 'schedule' }> => ({
  type: 'schedule',
  title: 'Schedule',
  scheduleId,
});
