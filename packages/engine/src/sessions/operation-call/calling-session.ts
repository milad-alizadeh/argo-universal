import type { NativePermissions } from '../native-permissions';
import type { SessionContext } from '../session-context';
import type { SessionActorRef } from '../session-machine';

type SessionEvent = Parameters<SessionActorRef['send']>[0];

type Answer = Parameters<NativePermissions['register']>[1];

// What an Operation Tool call reads of its calling Session, and how it asks it; the Session machine owns all of it.
export class CallingSession {
  public constructor(private readonly actor: SessionActorRef) {}
  private get context(): SessionContext {
    return this.actor.getSnapshot().context;
  }
  public get stored(): boolean {
    return this.context.stored;
  }
  public get open(): boolean {
    return this.actor.getSnapshot().status === 'active';
  }
  public get inTurn(): boolean {
    return this.actor.getSnapshot().hasTag('turn');
  }
  public get activeTurnId(): string | null {
    return this.context.activeTurnId;
  }
  // Aborts when the Session's Agent connection closes.
  public get closing(): AbortSignal {
    return this.context.acpLifetime.signal;
  }
  public createId(): string {
    return this.context.input.createId();
  }
  // Whether a Permission request for this Tool call waits for the user's answer.
  public awaitsAnswer(toolCallId: string): boolean {
    return this.context.permissionQueue.some(
      (request) => request.toolCallId === toolCallId,
    );
  }
  public onAnswer(requestId: string, answer: Answer): void {
    this.context.nativePermissions.register(requestId, answer);
  }
  public send(event: SessionEvent): void {
    this.actor.send(event);
  }
}
