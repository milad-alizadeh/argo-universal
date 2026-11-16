import { hashKey, type QueryKey } from '@tanstack/react-query';

/*
 * What the cache knows of the draws that run outside a query's own fetch, by tree: which are drawing now, which
 * a stale mark named while they drew, and how often each tree was patched or had pages land, so a draw that
 * began before cannot paint over either.
 */
export class DrawTracking {
  private readonly drawing = new Set<string>();
  private readonly marked = new Set<string>();
  private readonly epochs = new Map<string, number>();

  public isDrawing(key: string): boolean {
    return this.drawing.has(key);
  }

  public begin(key: string): void {
    this.drawing.add(key);
  }

  public end(key: string): void {
    this.drawing.delete(key);
  }

  // A mark arrived: a tree that is drawing is marked again when its draw lands.
  public markIfDrawing(key: string): void {
    if (this.drawing.has(key)) this.marked.add(key);
  }

  // Whether a mark arrived while the tree drew; asking forgets it.
  public takeMarked(key: string): boolean {
    return this.marked.delete(key);
  }

  public epochOf(key: string): number {
    return this.epochs.get(key) ?? 0;
  }

  public touch(key: string | QueryKey): void {
    const hashed = typeof key === 'string' ? key : hashKey(key);

    this.epochs.set(hashed, this.epochOf(hashed) + 1);
  }
}
