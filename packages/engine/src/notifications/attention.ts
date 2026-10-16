interface SessionAttention {
  sessionId: string | null;
  expiresAt: number;
}

export class NotificationAttention {
  private readonly connections = new Map<string, SessionAttention>();

  public constructor(private readonly leaseMs: number) {}

  public report(connectionId: string, sessionId: string | null): void {
    this.connections.set(connectionId, {
      sessionId,
      expiresAt: Date.now() + this.leaseMs,
    });
  }

  public forget(connectionId: string): void {
    this.connections.delete(connectionId);
  }

  public includes(sessionId: string): boolean {
    for (const [id, attention] of this.connections)
      if (this.active(id, attention) === sessionId) return true;

    return false;
  }

  private active(id: string, attention: SessionAttention): string | null {
    if (attention.expiresAt > Date.now()) return attention.sessionId;
    this.connections.delete(id);

    return null;
  }
}
