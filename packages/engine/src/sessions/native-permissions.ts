import type { PendingPermission } from '@repo/contracts';

export const nativePermissionEvent = 'session.permissionRequested';

export type NativePermissionEvent = {
  type: typeof nativePermissionEvent;
  turnId: string;
  request: PendingPermission;
};

type Answer = (optionId: string | null) => void;

// Argo owns these answers; they never reach an Agent or a Plugin Hook.
export class NativePermissions {
  private readonly answers = new Map<string, Answer>();
  public register(requestId: string, answer: Answer): void {
    this.answers.set(requestId, answer);
  }
  public answer(requestId: string, optionId: string | null): void {
    const answer = this.answers.get(requestId);
    this.answers.delete(requestId);
    answer?.(optionId);
  }
  public cancelAll(): void {
    for (const id of this.answers.keys()) this.answer(id, null);
  }
}
