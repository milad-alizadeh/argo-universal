import type {
  ComponentEvent,
  PluginViewInput,
  WireNode,
} from '@repo/contracts/plugins/wire';
import { findWireNode } from '@repo/contracts/plugins/wire-node-key';
import { replaceEqualDeep } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type {
  PluginOnEvent,
  PluginViewState,
} from '../../lib/product/plugin-registry';

type Held = {
  key: string;
  event: ComponentEvent;
  // What the tap was aimed at, read from the kept tree when it was made.
  target: WireNode | undefined;
  resolve: (delivery: Promise<void> | void) => void;
  reject: (reason: Error) => void;
};

const changed = 'This changed before your tap reached it. Try again.';

const sameNode = (
  drawn: WireNode | undefined,
  live: WireNode | undefined,
): boolean =>
  drawn !== undefined &&
  (drawn === live || replaceEqualDeep(drawn, live) === drawn);

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
    return new Promise((resolve, reject) => {
      this.held.push({
        key,
        event,
        target: findWireNode(drawn, key),
        resolve,
        reject,
      });
    });
  }

  public release(live: WireNode, deliver: PluginOnEvent): void {
    for (const { key, event, target, resolve, reject } of this.take())
      if (sameNode(target, findWireNode(live, key)))
        resolve(deliver(key, event));
      else reject(new Error(changed));
  }

  public drop(): void {
    for (const { resolve } of this.take()) resolve();
  }

  private take(): Held[] {
    const { held } = this;
    this.held = [];

    return held;
  }
}

interface HeldUntilLive {
  page: PluginViewInput;
  live: boolean;
  drawn: PluginViewState;
  onEvent: PluginOnEvent;
}

// A tap on a tree with no view behind it waits for the view; the choice and its reasons are in ADR-0048.
export function useHeldUntilLive(input: HeldUntilLive): PluginOnEvent {
  const { page, live, drawn, onEvent } = input;
  const { root, viewId } = drawn;
  const [held] = useState(() => new HeldEvents());

  useEffect(() => {
    if (viewId && root) held.release(root, onEvent);
  }, [held, viewId, root, onEvent]);

  useEffect(() => {
    if (!live) held.drop();
  }, [held, live]);

  useEffect(() => (): void => held.drop(), [held, page]);

  if (viewId || !root) return onEvent;

  return (nodeKey, event) => held.hold(root, nodeKey, event);
}
