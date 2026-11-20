import type { NonUserPromptSender } from '@repo/contracts';
import type { operations } from '@repo/contracts/operations';
import type { z } from 'zod';
import {
  decodeSchedule,
  deliveryWrite,
  ScheduleStore,
  second,
  type ScheduleRow,
} from './schedule-store';
import { sendQueueCommand } from './sent-prompt/queue';
import { steerOrWait } from './sent-prompt/steering';
import { requireWritableSession } from './session-command';
import type { SessionActorRef } from './session-machine';
import type { SessionHandlerSources } from './session-sources';

type Definitions = typeof operations;

type Create = z.output<Definitions['session.schedulePrompt']['params']>;

type Manage = z.output<Definitions['session.manageSchedule']['params']>;

type Schedule = ReturnType<typeof decodeSchedule>;

const maximumDelay = 2147483647;

export class Schedules {
  private readonly timers = new Map<string, NodeJS.Timeout>();
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
  public async create(input: Create): Promise<Schedule> {
    requireWritableSession(this.sources.readSession(input.sessionId));
    const row = await this.store.insert(input);
    this.arm(row);

    return decodeSchedule(row);
  }
  public async manage(input: Manage): Promise<Record<string, never>> {
    await this.store.change(input);
    this.scheduleNext(input.id, 0);

    return {};
  }
  private stop(): void {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
  }
  private scheduleNext(id: string, retryAfter: number): void {
    if (this.stopping.aborted) return;
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
    const row = this.store.get(id);

    if (isActive(row)) this.arm(row, retryAfter);
  }
  private arm(row: ScheduleRow, retryAfter = 0): void {
    if (this.stopping.aborted) return;

    const delay = Math.min(
      maximumDelay,
      Math.max(retryAfter, row.nextAt - Date.now(), 0),
    );

    this.timers.set(
      row.id,
      setTimeout(() => void this.fire(row), delay).unref(),
    );
  }
  private async fire(row: ScheduleRow): Promise<void> {
    try {
      if (row.nextAt <= Date.now()) await this.deliver(row);
      this.scheduleNext(row.id, 0);
    } catch {
      this.scheduleNext(row.id, second);
    }
  }
  private async deliver(row: ScheduleRow): Promise<void> {
    const session = await this.sources.open.ready(
      row.sessionId,
      'session.queue',
      this.stopping,
    );

    const current = this.store.get(row.id);

    if (!stillDue(current, row.nextAt)) return;
    await this.enqueue(session, row);
  }
  private async enqueue(
    session: SessionActorRef,
    row: ScheduleRow,
  ): Promise<void> {
    const sender = scheduleSender(row.id);
    const queuedId = this.sources.createId();
    const busy = session.getSnapshot().context.activeTurnId !== null;
    await sendQueueCommand(session, {
      command: { action: 'append', prompt: decodeSchedule(row).prompt },
      sender,
      queuedId,
      commitWith: deliveryWrite(row, Date.now()),
    });

    if (busy) await steerOrWait(session, { sender, id: queuedId });
  }
}

const scheduleSender = (
  scheduleId: string,
): Extract<NonUserPromptSender, { type: 'schedule' }> => ({
  type: 'schedule',
  title: 'Schedule',
  scheduleId,
});

const stillDue = (row: ScheduleRow | undefined, at: number): boolean =>
  row?.paused === false && row.nextAt === at;

const isActive = (row: ScheduleRow | undefined): row is ScheduleRow =>
  row?.paused === false;
