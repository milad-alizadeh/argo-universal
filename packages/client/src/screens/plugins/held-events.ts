import type { ComponentEvent, WireNode } from '@repo/contracts/plugins/wire';
import { findWireNode } from '@repo/contracts/plugins/wire-node-key';
import { replaceEqualDeep } from '@tanstack/react-query';
import type { PluginOnEvent } from '../../lib/product/plugin-registry';

type Held = {
  key: string;
  event: ComponentEvent;
  // What the tap was aimed at, read from the kept tree when it was made.
  target: WireNode | undefined;
  settle: (delivery: Promise<void>) => void;
};

const changed = 'This changed before your tap reached it. Try again.';

const sameNode = (
  drawn: WireNode | undefined,
  live: WireNode | undefined,
): boolean => drawn !== undefined && replaceEqualDeep(drawn, live) === drawn;

/*
 * Taps on a kept tree, waiting for the page's live view. A tree can be old: the same key may now mean another Issue,
 * so a tap reaches the live view only if its node is exactly as it was drawn. Otherwise it fails where the reader sees
 * it, and it never runs a handler they did not aim at. The page leaving first ends the tap, which then never runs.
 */
export class HeldEvents {
  private held: Held[] = [];

  public hold(
    drawn: WireNode,
    key: string,
    event: ComponentEvent,
  ): Promise<void> {
    return new Promise((resolve) => {
      const target = findWireNode(drawn, key);

      this.held.push({ key, event, target, settle: resolve });
    });
  }

  public release(live: WireNode, deliver: PluginOnEvent): void {
    for (const { key, event, target, settle } of this.take())
      settle(
        sameNode(target, findWireNode(live, key))
          ? Promise.resolve(deliver(key, event))
          : Promise.reject(new Error(changed)),
      );
  }

  public drop(): void {
    for (const { settle } of this.take()) settle(Promise.resolve());
  }

  private take(): Held[] {
    const { held } = this;
    this.held = [];

    return held;
  }
}
