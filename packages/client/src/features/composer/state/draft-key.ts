// Whose draft a Composer holds: a Session's own, or New Session's for one Project.
export type DraftOwner =
  | { type: 'session'; sessionId: string }
  | { type: 'new-session'; projectId: string };

// The key this Device stores a Composer draft under.
export function draftKey(owner: DraftOwner): string {
  return owner.type === 'session'
    ? `composer-draft:session:${owner.sessionId}`
    : `composer-draft:new-session:${owner.projectId}`;
}
