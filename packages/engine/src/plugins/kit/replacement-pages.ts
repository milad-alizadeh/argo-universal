import type { ReactNode } from 'react';

export class ReplacementPages {
  private readonly pending = new Map<string, ReactNode>();

  public register(path: string, element: ReactNode): void {
    this.pending.set(path, element);
  }

  public take(path: string): ReactNode {
    const replacement = this.pending.get(path);
    this.pending.delete(path);

    return replacement ?? null;
  }

  public discard(path: string): void {
    this.pending.delete(path);
  }
}
