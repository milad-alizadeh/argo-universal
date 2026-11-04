import type { TreePatch } from '@repo/contracts/plugins/optimistic-tree';
import {
  treeAfter,
  type DrawAnswer,
  type HashedTree,
} from '@repo/contracts/plugins/page-draw';
import type { WireNode } from '@repo/contracts/plugins/wire';

/*
 * What an open page keeps of its address, as the App keeps it: the tree last drawn and its hash, how many pages
 * of its list it shows, why the last draw failed, and an Operation's optimistic patch, shown until the next draw
 * or until it is put back.
 */
export class KeptTree {
  private kept: HashedTree | undefined;
  private patched: WireNode | undefined;
  private failure: string | undefined;
  private shownPages = 1;

  get pages(): number {
    return this.shownPages;
  }

  get hash(): string | undefined {
    return this.kept?.hash;
  }

  get error(): string | undefined {
    return this.failure;
  }

  // The tree shown, patched or not; none before a draw.
  get shown(): WireNode | undefined {
    return this.patched ?? this.kept?.root;
  }

  keep(answer: DrawAnswer): void {
    if (answer.kind === 'failed') {
      this.failure = answer.error;

      return;
    }

    this.failure = undefined;
    this.patched = undefined;
    this.shownPages = Math.max(1, answer.pages);
    this.kept = treeAfter(this.kept, answer);
  }

  // A new address keeps nothing of the last one.
  forget(): void {
    this.kept = undefined;
    this.patched = undefined;
  }

  patch(patch: TreePatch): Promise<void> {
    const root = this.shown;

    if (root) this.patched = patch(root);

    return Promise.resolve();
  }

  // A patch taken off the patched tree; a draw since has already replaced it.
  unpatch(patch: TreePatch): void {
    if (this.patched) this.patched = patch(this.patched);
  }
}
