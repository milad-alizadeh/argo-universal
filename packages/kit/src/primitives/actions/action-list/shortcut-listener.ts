import { useEffect, useEffectEvent } from 'react';
import { Platform } from 'react-native';
import { shortcutMatches, type ActionShortcut } from '#primitives/content/kbd';
import type { DeclaredAction } from './action-declarations';
import type { ShortcutOptions } from './action-shortcut-scope';
import type { ShortcutRegistry } from './shortcut-registry';

interface ListenerOptions extends ShortcutOptions {
  scope: ShortcutRegistry;
  id: string;
}

export function useShortcutListener(options: ListenerOptions): void {
  const onKey = useEffectEvent((event: KeyboardEvent): void =>
    activateShortcut(options, event),
  );

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const listener = (event: KeyboardEvent): void => onKey(event);
    document.addEventListener('keydown', listener, true);

    return (): void => document.removeEventListener('keydown', listener, true);
  }, []);
}

function activateShortcut(
  options: ListenerOptions,
  event: KeyboardEvent,
): void {
  if (!eligibleEvent(options, event)) return;

  const action = options.actions.find((candidate) =>
    canActivate({ options, event, action: candidate }),
  );

  if (action) runShortcut(action, event);
}

function runShortcut(action: DeclaredAction, event: KeyboardEvent): void {
  event.preventDefault();
  event.stopPropagation();
  action.onPress();
}

function blockedEvent(event: KeyboardEvent): boolean {
  return [
    event.defaultPrevented,
    event.repeat,
    event.isComposing,
    editingTarget(event.target),
  ].some(Boolean);
}

function editingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        'input, textarea, [contenteditable], [role="dialog"], [role="menu"]',
      ),
    )
  );
}

function reachable(
  options: ListenerOptions,
  target: EventTarget | null,
): boolean {
  const root = document.getElementById(options.id);

  if (!root) return false;

  if (root.getClientRects().length === 0) return false;

  return contextTarget(options.context, root, target);
}

function contextTarget(
  context: boolean,
  root: HTMLElement,
  target: EventTarget | null,
): boolean {
  return !context || (target instanceof Node && root.contains(target));
}

function canActivate({
  options,
  event,
  action,
}: {
  options: ListenerOptions;
  event: KeyboardEvent;
  action: DeclaredAction;
}): boolean {
  if (!enabledShortcut(action)) return false;

  return (
    options.scope.owns(options.id, action) &&
    shortcutMatches(action.shortcut, event)
  );
}

function eligibleEvent(
  options: ListenerOptions,
  event: KeyboardEvent,
): boolean {
  return !blockedEvent(event) && reachable(options, event.target);
}

function enabledShortcut(
  action: DeclaredAction,
): action is DeclaredAction & { shortcut: ActionShortcut } {
  return !action.disabled && action.shortcut !== undefined;
}
