import type { NonUserPromptSender } from '@repo/contracts';
import type { operations } from '@repo/contracts/operations';
import type { z } from 'zod';
import {
  decodeSchedule,
  deliveryWrite,
  ScheduleStore,
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

import { startSchedule, type ScheduleActor } from './schedule-machine';

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
  public async create(input: Create): Promise<Schedule> {
    requireWritableSession(this.sources.readSession(input.sessionId));
    const row = await this.store.insert(input);
    this.arm(row);

    return decodeSchedule(row);
  }
  public async manage(input: Manage): Promise<Record<string, never>> {
    await this.store.change(input);
    this.replace(input.id);

    return {};
  }
  private stop(): void {
    for (const actor of this.actors.values()) actor.stop();
    this.actors.clear();
  }
  private replace(id: string): void {
    this.actors.get(id)?.stop();
    this.actors.delete(id);
    const row = this.store.get(id);

    if (isActive(row)) this.arm(row);
  }
  private arm(row: ScheduleRow): void {
    if (this.stopping.aborted) return;

    const actor = startSchedule({
      now: Date.now,
      nextAt: () => this.store.get(row.id)?.nextAt ?? Infinity,
      deliver: (signal) => this.deliver(row.id, signal),
    });

    this.actors.set(row.id, actor);
  }
  private async deliver(id: string, signal: AbortSignal): Promise<void> {
    const row = this.store.get(id);

    if (!isActive(row)) return;

    const session = await this.sources.open.ready(
      row.sessionId,
      'session.queue',
      signal,
    );

    signal.throwIfAborted();

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

    if (busy) void steerOrWait(session, { sender, id: queuedId });
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
