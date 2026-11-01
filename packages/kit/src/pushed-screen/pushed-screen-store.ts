import type { ReactNode } from 'react';
import { listenerSet } from '../listener-set';

/*
 * The pages a component has pushed on the screen's own stack. A route cannot carry a component, so the opener leaves
 * its page here under an id, the route `/screen/[id]` draws it, and the opener keeps it current while it is shown.
 */
interface Pushed {
  content: ReactNode;
  // True from the moment the route draws the page until Back removes it.
  routed: boolean;
  // The opener unmounted while the page was drawn: the page goes when Back takes it.
  orphaned?: boolean;
}

const pushed = new Map<string, Pushed>();

const listeners = listenerSet();

let counter = 0;

export const subscribePushedScreens = listeners.subscribe;

export const newScreenId = (): string => String(++counter);

export const pushedContent = (id: string): ReactNode =>
  pushed.get(id)?.content ?? null;

// False for an id no opener has pushed, such as one arriving in a link.
export const hasPushedScreen = (id: string): boolean => pushed.has(id);

export const isRouted = (id: string): boolean =>
  pushed.get(id)?.routed ?? false;

// The opener's page as it is now; the route redraws it.
export function showPushedScreen(id: string, content: ReactNode): void {
  pushed.set(id, { routed: false, ...pushed.get(id), content });
  listeners.notify();
}

const leavesOrphaned = (held: Pushed, routed: boolean): boolean =>
  held.orphaned === true && !routed;

// The route marks the page drawn while it is mounted.
export function routePushedScreen(id: string, routed: boolean): void {
  const held = pushed.get(id);

  if (!held) return;

  if (leavesOrphaned(held, routed)) pushed.delete(id);
  else pushed.set(id, { ...held, routed });

  listeners.notify();
}

// Once Back has taken the page away the opener lets go of its content.
export function forgetPushedScreen(id: string): void {
  pushed.delete(id);
}

// The opener unmounted: a page still drawn stays until Back takes it, any other goes at once.
export function releasePushedScreen(id: string): void {
  const held = pushed.get(id);

  if (held?.routed) pushed.set(id, { ...held, orphaned: true });
  else pushed.delete(id);
}
