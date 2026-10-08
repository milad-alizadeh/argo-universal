import { useEffect, useId } from 'react';
import type { RequestKeyboardOptions } from './use-request-keyboard';

const cardPrefix = 'request-card-';
const choiceSelector =
  '[role="combobox"], [role="listbox"], [role="menu"], [aria-expanded]';

function modifiedKey(event: KeyboardEvent): boolean {
  return event.isComposing || event.shiftKey || navigationModifier(event);
}

function navigationModifier(event: KeyboardEvent): boolean {
  return event.ctrlKey || event.altKey || event.metaKey;
}

function focusedInCard(nativeID: string): boolean {
  return (
    document.getElementById(nativeID)?.contains(document.activeElement) ?? false
  );
}

function activeCard(nativeID: string): boolean {
  const focused = document.activeElement;
  if (focused !== document.body) return focusedInCard(nativeID);
  return document.querySelectorAll(`[id^="${cardPrefix}"]`).length === 1;
}

function shortcutAction(
  event: KeyboardEvent,
  options: RequestKeyboardOptions,
): (() => void) | undefined {
  if (event.key === 'Escape') return options.onEscape;
  if (event.key !== 'Enter') return undefined;
  return enterAction(options);
}

function enterAction(
  options: RequestKeyboardOptions,
): (() => void) | undefined {
  if (document.activeElement?.closest('[role="button"], a')) return undefined;
  return options.onEnter;
}

function applyShortcut(
  event: KeyboardEvent,
  options: RequestKeyboardOptions,
): void {
  const action = shortcutAction(event, options);
  if (!action) return;
  event.preventDefault();
  event.stopPropagation();
  action();
}

function eligibleKey(event: KeyboardEvent, nativeID: string): boolean {
  if (blockedKey(event)) return false;
  if (!activeCard(nativeID)) return false;
  return !focusedChoice();
}

function focusedChoice(): boolean {
  return Boolean(document.activeElement?.closest(choiceSelector));
}

function blockedKey(event: KeyboardEvent): boolean {
  return event.defaultPrevented || modifiedKey(event);
}

function listen(
  nativeID: string,
  options: RequestKeyboardOptions,
): (() => void) | undefined {
  if (!options.wide || options.inactive) return undefined;
  const keydown = (event: KeyboardEvent): void => {
    if (eligibleKey(event, nativeID)) applyShortcut(event, options);
  };
  document.addEventListener('keydown', keydown, true);
  return (): void => document.removeEventListener('keydown', keydown, true);
}

export function useRequestKeyboard(options: RequestKeyboardOptions): string {
  const { inactive, wide, onEnter, onEscape } = options;
  const nativeID = `${inactive ? 'inactive-' : ''}${cardPrefix}${useId()}`;
  useEffect(
    () => listen(nativeID, { inactive, wide, onEnter, onEscape }),
    [nativeID, inactive, wide, onEnter, onEscape],
  );
  return nativeID;
}
