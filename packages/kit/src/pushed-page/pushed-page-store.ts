import type { ReactNode } from 'react';
import { listenerSet } from '../listener-set';

/*
 * The pages a component has pushed on the screen's own stack. A route cannot carry a component, so the opener leaves
 * its page here under an id, the route `/page/[id]` draws it, and the opener keeps it current while it is shown.
 */
interface Pushed {
  content: ReactNode;
  // True from the moment the route draws the page until Back removes it.
  routed: boolean;
}

const pushed = new Map<string, Pushed>();

const listeners = listenerSet();

let counter = 0;

export const subscribePushedPages = listeners.subscribe;

export const newPageId = (): string => String(++counter);

export const pushedContent = (id: string): ReactNode =>
  pushed.get(id)?.content ?? null;

export const isRouted = (id: string): boolean =>
  pushed.get(id)?.routed ?? false;

// The opener's page as it is now; the route redraws it.
export function showPushedPage(id: string, content: ReactNode): void {
  pushed.set(id, { routed: false, ...pushed.get(id), content });
  listeners.notify();
}

// The route marks the page drawn while it is mounted.
export function routePushedPage(id: string, routed: boolean): void {
  const held = pushed.get(id);

  if (!held) return;

  pushed.set(id, { ...held, routed });
  listeners.notify();
}

// Once Back has taken the page away the opener lets go of its content.
export function forgetPushedPage(id: string): void {
  pushed.delete(id);
}
