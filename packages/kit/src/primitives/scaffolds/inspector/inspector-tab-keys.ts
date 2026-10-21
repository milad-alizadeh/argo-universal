import type { KeyboardEvent, KeyboardEventHandler } from 'react';
import type { InspectorTab, InspectorTabsProps } from './inspector-props';

function destination(
  key: string,
  index: number,
  count: number,
): number | undefined {
  const destinations = new Map([
    ['ArrowRight', (index + 1) % count],
    ['ArrowLeft', (index + count - 1) % count],
    ['Home', 0],
    ['End', count - 1],
    [' ', index],
  ]);

  return destinations.get(key);
}

function focusTab(event: KeyboardEvent<HTMLElement>, index: number): void {
  const list = event.currentTarget.closest('[role="tablist"]');

  if (!list) return;

  const buttons = list.querySelectorAll<HTMLElement>('[role="tab"]');

  buttons[index]?.focus();
}

function pressTabKey(
  event: KeyboardEvent<HTMLElement>,
  tab: InspectorTab,
  tabs: InspectorTabsProps,
): void {
  const index = tabs.items.findIndex((item) => item.key === tab.key);
  const next = destination(event.key, index, tabs.items.length);

  if (next === undefined) return;

  event.preventDefault();
  const target = tabs.items[next];

  if (!target) return;

  tabs.onSelect(target.key);
  focusTab(event, next);
}

interface TabKeys {
  onKeyDown: KeyboardEventHandler<HTMLElement>;
}

// React Native Web forwards keyboard events; native tabs use their platform's focus navigation.
export const tabKeys = (
  tab: InspectorTab,
  tabs: InspectorTabsProps,
): TabKeys => ({
  onKeyDown: (event) => pressTabKey(event, tab, tabs),
});
