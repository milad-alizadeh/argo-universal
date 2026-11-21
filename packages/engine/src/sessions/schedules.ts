import type { SentPromptSender } from '@repo/contracts';
import { startSchedule, type ScheduleActor } from './schedule-machine';
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
  private readonly actors = new Map<string, ScheduleActor>();
  private readonly store: ScheduleStore;
  public constructor(
    private readonly sources: SessionHandlerSources,
    private readonly stopping: AbortSignal = new AbortController().signal,
  ) {
    this.store = new ScheduleStore(sources);

    for (const row of this.store.active()) this.arm(row);
    stopping.addEventListener('abort', () => this.stop(), { once: true });
  }
  public list(sessionId: string): Schedule[] {
    return this.store.list(sessionId);
  }
  public async create(input: CreateSchedule): Promise<Schedule> {
    requireWritableSession(this.sources.readSession(input.sessionId));
    const schedule = await this.store.insert(input);
    this.arm(schedule);

    return schedule;
  }
  public async manage(input: ManageSchedule): Promise<Record<string, never>> {
    await this.store.change(input);
    this.replace(input);

    return {};
  }
  private stop(): void {
    for (const actor of this.actors.values()) actor.stop();
    this.actors.clear();
  }
  private replace({ id, sessionId }: ManageSchedule): void {
    this.disarm(id);

    if (this.store.deadline(id) !== undefined) this.arm({ id, sessionId });
  }
  private arm({ id, sessionId }: Pick<Schedule, 'id' | 'sessionId'>): void {
    if (this.stopping.aborted) return;

    const actor = startSchedule({
      now: Date.now,
      nextAt: () => this.store.deadline(id) ?? Infinity,
      deliver: (signal) => this.deliver(id, sessionId, signal),
    });

    this.actors.set(id, actor);
  }
  private async deliver(
    id: string,
    sessionId: string,
    signal: AbortSignal,
  ): Promise<void> {
    if (!this.store.occurrence(id)) {
      this.disarm(id);

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

    if (
      !signal.aborted &&
      (!occurrence || this.store.deadline(id) === undefined)
    )
      this.disarm(id);
  }
  private disarm(id: string): void {
    this.actors.get(id)?.stop();
    this.actors.delete(id);
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
