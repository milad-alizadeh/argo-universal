import type { KeyDownEvent, PressableProps } from 'react-native';
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

// On the web the tab is a DOM element; native tabs use their platform's focus navigation.
function tabList(event: KeyDownEvent): Element | null {
  const tab = event.currentTarget;

  return tab instanceof HTMLElement ? tab.closest('[role="tablist"]') : null;
}

function tabButtons(event: KeyDownEvent): ArrayLike<HTMLElement> {
  const list = tabList(event);

  return list ? list.querySelectorAll<HTMLElement>('[role="tab"]') : [];
}

function focusTab(event: KeyDownEvent, index: number): void {
  tabButtons(event)[index]?.focus();
}

function pressTabKey(
  event: KeyDownEvent,
  tab: InspectorTab,
  tabs: InspectorTabsProps,
): void {
  const index = tabs.items.findIndex((item) => item.key === tab.key);
  const next = destination(event.nativeEvent.key, index, tabs.items.length);

  if (next === undefined) return;

  event.preventDefault();
  const target = tabs.items[next];

  if (!target) return;

  tabs.onSelect(target.key);
  focusTab(event, next);
}

type TabKeys = Pick<PressableProps, 'onKeyDown'>;

// React Native Web forwards keyboard events; native tabs use their platform's focus navigation.
export const tabKeys = (
  tab: InspectorTab,
  tabs: InspectorTabsProps,
): TabKeys => ({
  onKeyDown: (event) => pressTabKey(event, tab, tabs),
});
