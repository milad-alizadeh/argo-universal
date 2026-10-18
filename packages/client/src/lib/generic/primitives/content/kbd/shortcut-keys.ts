import type { ActionShortcut } from './shortcut-props';

export const appleKeyboard = (): boolean =>
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad/.test(navigator.platform);

const appleLabels = { meta: '⌘', ctrl: '⌃', alt: '⌥', shift: '⇧' };

const otherLabels = { meta: 'Ctrl', ctrl: 'Ctrl', alt: 'Alt', shift: 'Shift' };

const keyLabels = new Map([
  ['Enter', '↵'],
  ['Escape', 'Esc'],
  ['Backspace', '⌫'],
  ['Delete', '⌦'],
  ['ArrowUp', '↑'],
  ['ArrowDown', '↓'],
  ['ArrowLeft', '←'],
  ['ArrowRight', '→'],
]);

const modifierOrder = ['ctrl', 'alt', 'shift', 'meta'] as const;

export function shortcutKeys(shortcut: ActionShortcut): string[] {
  const labels = appleKeyboard() ? appleLabels : otherLabels;

  return [
    ...modifierOrder.flatMap((modifier) =>
      shortcut.modifiers.includes(modifier) ? [labels[modifier]] : [],
    ),
    keyLabels.get(shortcut.key) ?? shortcut.key.toUpperCase(),
  ];
}

function eventModifiers(event: KeyboardEvent): string[] {
  const pressed = {
    meta: event.metaKey,
    ctrl: event.ctrlKey,
    alt: event.altKey,
    shift: event.shiftKey,
  };

  return modifierOrder.filter((modifier) => pressed[modifier]);
}

export function shortcutMatches(
  shortcut: ActionShortcut,
  event: KeyboardEvent,
): boolean {
  const modifiers = shortcut.modifiers.map((modifier) =>
    modifier === 'meta' && !appleKeyboard() ? 'ctrl' : modifier,
  );

  return (
    event.key.toLowerCase() === shortcut.key.toLowerCase() &&
    modifiers.sort().join('+') === eventModifiers(event).sort().join('+')
  );
}

export function primaryModifier(): 'meta' | 'ctrl' {
  return appleKeyboard() ? 'meta' : 'ctrl';
}
