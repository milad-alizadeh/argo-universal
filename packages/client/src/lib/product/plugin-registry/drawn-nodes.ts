import type { WireNode } from '@repo/contracts/plugins/wire';
import type { ReactElement } from 'react';

type Drawn = { node: WireNode; element: ReactElement | null };

// Whether `key` is `other`, sits inside it, or holds it.
const related = (key: string, other: string): boolean =>
  key === other || within(key, other) || within(other, key);

const within = (child: string, key: string): boolean =>
  child.startsWith(`${key}/`) || child.startsWith(`${key}#`);

/*
 * The element each node of one tree was last drawn as, by its address. A node the Server left as it was is the same
 * object (`applyPatch` and the kept tree share them), so it draws as the same element and React skips it and
 * everything under it. A field's own state lives outside its node, so a field that changes forgets its drawing.
 */
export class DrawnNodes {
  private readonly drawn = new Map<string, Drawn>();

  // The element `node` drew as at `key`, or undefined when it has none.
  public get(key: string, node: WireNode): ReactElement | null | undefined {
    const drawn = this.drawn.get(key);

    return drawn?.node === node ? drawn.element : undefined;
  }

  public set(key: string, node: WireNode, element: ReactElement | null): void {
    this.drawn.set(key, { node, element });
  }

  // The node at `key` draws again, with the nodes around it that hold it and the nodes inside it.
  public forget(key: string): void {
    for (const address of this.drawn.keys())
      if (related(address, key)) this.drawn.delete(address);
  }

  // Only nodes still in the tree keep their drawing.
  public keep(live: ReadonlySet<string>): void {
    for (const key of this.drawn.keys())
      if (!live.has(key)) this.drawn.delete(key);
  }
}
