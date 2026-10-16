import type { SessionNotification } from '@agentclientprotocol/sdk';

const associatedId = (
  update: SessionNotification['update'],
): string | null | undefined => {
  if (update.sessionUpdate === 'subagent_update') return update.sessionId;

  if (update.sessionUpdate === 'session_message')
    return update.recipientSessionId;

  return undefined;
};

// Child identities belong to exactly one open root; they never become executable Agent sessions.
export class SubagentRoutes<Owner> {
  private readonly children = new Map<string, Owner>();
  public constructor(private readonly roots: ReadonlyMap<string, Owner>) {}

  public owner(id: string): Owner | undefined {
    return this.roots.get(id) ?? this.children.get(id);
  }

  public associate(notification: SessionNotification, owner: Owner): boolean {
    const id = associatedId(notification.update);

    if (!id) return true;

    if (this.roots.has(id)) return false;

    return this.associateChild(id, owner);
  }

  private associateChild(id: string, owner: Owner): boolean {
    const existing = this.children.get(id);

    if (existing && existing !== owner) return false;
    this.children.set(id, owner);

    return true;
  }

  public release(owner: Owner): void {
    for (const [id, childOwner] of this.children)
      if (childOwner === owner) this.children.delete(id);
  }
}
