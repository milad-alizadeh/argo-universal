// Each Session's `auth_required` Turn end that a sign-in answered, for the App's life, so its card stays cleared when the Session page mounts again.
export class AnsweredTurns {
  private readonly turns = new Map<string, string>();
  private readonly listeners = new Set<() => void>();

  public readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);

    return () => void this.listeners.delete(listener);
  };

  public answered(sessionId: string): string | undefined {
    return this.turns.get(sessionId);
  }

  public answer(sessionId: string, turnEnd: string): void {
    if (this.turns.get(sessionId) === turnEnd) return;
    this.turns.set(sessionId, turnEnd);

    for (const listener of this.listeners) listener();
  }
}

// The App's one record: a Session page reads it on every mount.
export const answeredTurns = new AnsweredTurns();
