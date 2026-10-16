import type { Subscription } from 'xstate';
import type { OpenSessionsActorRef, SessionActorRef } from '../sessions';
import {
  inputRequestId,
  pendingNotificationInput,
  type InputNotification,
} from './input-source';

interface InputWatch {
  actor: SessionActorRef;
  subscription: Subscription;
  requestId: string | null;
}

type LiveSessions = Record<string, SessionActorRef>;

export class SessionInputNotifications {
  private readonly watches = new Map<string, InputWatch>();

  public constructor(
    private readonly sessions: OpenSessionsActorRef,
    private readonly publish: (
      sessionId: string,
      input: InputNotification,
    ) => void,
  ) {}

  public start(): () => void {
    this.sync(true);
    const subscription = this.sessions.subscribe(() => this.sync(false));

    return () => {
      subscription.unsubscribe();

      for (const [id, watch] of this.watches) this.remove(id, watch);
    };
  }

  private sync(baseline: boolean): void {
    const sessions = this.sessions.getSnapshot().context.sessions;

    for (const [id, actor] of Object.entries(sessions))
      this.watch(id, actor, baseline);
    this.removeClosed(sessions);
  }

  private removeClosed(sessions: LiveSessions): void {
    for (const [id, watch] of this.watches)
      if (sessions[id] !== watch.actor) this.remove(id, watch);
  }

  private remove(id: string, watch: InputWatch): void {
    watch.subscription.unsubscribe();
    this.watches.delete(id);
  }

  private watch(id: string, actor: SessionActorRef, baseline: boolean): void {
    if (this.currentActor(id) === actor) return;
    this.removePrevious(id);

    const requestId = baseline
      ? inputRequestId(pendingNotificationInput(actor))
      : null;

    const subscription = actor.subscribe(() => this.input(id));
    this.watches.set(id, { actor, subscription, requestId });
    this.input(id);
  }

  private currentActor(id: string): SessionActorRef | undefined {
    return this.watches.get(id)?.actor;
  }

  private removePrevious(id: string): void {
    const previous = this.watches.get(id);

    if (previous) this.remove(id, previous);
  }

  private input(id: string): void {
    const watch = this.watches.get(id);

    if (!watch) return;
    const input = this.changedInput(watch);

    if (input) this.publish(id, input);
  }

  private changedInput(watch: InputWatch): InputNotification | null {
    const input = pendingNotificationInput(watch.actor);
    const requestId = inputRequestId(input);

    if (requestId === watch.requestId) return null;
    watch.requestId = requestId;

    return input;
  }
}
