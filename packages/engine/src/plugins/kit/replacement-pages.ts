import type { ReactNode } from 'react';

const unusedReplacementMs = 30_000;

export class ReplacementPages {
  private readonly pending = new Map<
    string,
    { element: ReactNode; expiry: ReturnType<typeof setTimeout> }
  >();

  public register(path: string, element: ReactNode): void {
    const expiry = setTimeout(
      () => this.pending.delete(path),
      unusedReplacementMs,
    );

    this.pending.set(path, { element, expiry });
  }

  public take(path: string): ReactNode {
    const replacement = this.pending.get(path);

    if (!replacement) return null;
    clearTimeout(replacement.expiry);
    this.pending.delete(path);

    return replacement.element;
  }
}
