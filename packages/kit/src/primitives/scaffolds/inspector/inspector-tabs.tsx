import type { ComponentProps, ReactElement } from 'react';
import { Pressable, View } from 'react-native';
import { tintTransitionClassName } from '#kit/motion';
import { cn } from '#kit/utils';
import { ChromeIconButton } from '#primitives/actions/icon-button';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import { CountBadge } from '#primitives/status/count-badge';
import { ScrollFadeView } from '../../../scroll-fade/scroll-fade';
import type { InspectorTab, InspectorTabsProps } from './inspector-props';
import { useTabFocus, type TabFocus } from './inspector-tab-focus';
import { tabKeys } from './inspector-tab-keys';

const tabClassName = 'h-7 flex-row items-center gap-1.5 rounded-md pl-2';

const tabState = {
  selected: { className: 'bg-card pr-1 shadow-control', tone: 'neutral' },
  unselected: {
    className: cn(
      'pr-2 web:hover:bg-hover web:active:bg-pressed',
      tintTransitionClassName,
    ),
    tone: 'muted',
  },
} as const;

function TabCount({
  count,
  countTone,
}: Pick<InspectorTab, 'count' | 'countTone'>): ReactElement | null {
  if (count === undefined) return null;

  return <CountBadge badge={{ count }} tone={countTone ?? 'muted'} />;
}

interface TabProps {
  tab: InspectorTab;
  selected: boolean;
  tabs: InspectorTabsProps;
  focus: TabFocus;
}

// Closes the selected tab; a sibling of the tab's own button, never inside it.
function CloseTab({ tab, selected, focus }: TabProps): ReactElement | null {
  if (!selected) return null;

  return (
    <ChromeIconButton
      variant="ghost"
      size="sm"
      accessibilityLabel={`Close ${tab.label}`}
      onPress={() => focus.close(tab.key)}
      icon="close"
    />
  );
}

function TabLabel({
  tab,
  selected,
}: Pick<TabProps, 'tab' | 'selected'>): ReactElement {
  const { tone } = tabState[selected ? 'selected' : 'unselected'];

  return (
    <>
      <Icon name={tab.icon} tone={tone} />
      <Text role="body" tone={tone} numberOfLines={1} className="font-medium">
        {tab.label}
      </Text>
      <TabCount count={tab.count} countTone={tab.countTone} />
    </>
  );
}

function tabAttributes(
  tab: InspectorTab,
  selected: boolean,
  tabs: InspectorTabsProps,
): ComponentProps<typeof Pressable> {
  return {
    role: 'tab',
    tabIndex: selected ? 0 : -1,
    'aria-selected': selected,
    ...tabKeys(tab, tabs),
  };
}

function TabButton({ tab, selected, tabs, focus }: TabProps): ReactElement {
  return (
    <Pressable
      {...tabAttributes(tab, selected, tabs)}
      ref={selected ? focus.selected : undefined}
      accessibilityLabel={tabName(tab)}
      onPress={() => tabs.onSelect(tab.key)}
      className="h-full flex-row items-center gap-1.5 rounded-md web:focus-visible:outline-2 web:focus-visible:outline-focus web:focus-visible:-outline-offset-2"
    >
      <TabLabel tab={tab} selected={selected} />
    </Pressable>
  );
}

function Tab(props: TabProps): ReactElement {
  const state = tabState[props.selected ? 'selected' : 'unselected'];

  return (
    <View className={cn(tabClassName, state.className)}>
      <TabButton {...props} />
      <CloseTab {...props} />
    </View>
  );
}

/*
 * The Inspector's tabs in place of its title: as many as the column fits, the rest scrolling behind a faded edge.
 * Never a segmented control; the column's own Expand and Close stay outside the scroll.
 */
export function InspectorTabs({
  tabs,
}: {
  tabs: InspectorTabsProps;
}): ReactElement {
  return (
    <ScrollFadeView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="flex-1"
    >
      <TabList tabs={tabs} />
    </ScrollFadeView>
  );
}

function TabList({ tabs }: { tabs: InspectorTabsProps }): ReactElement {
  const focus = useTabFocus(tabs);

  return (
    <View role="tablist" className="flex-row items-center gap-0.5">
      {tabs.items.map((tab) => (
        <Tab
          key={tab.key}
          {...{ tab, tabs, focus }}
          selected={tab.key === tabs.selected}
        />
      ))}
    </View>
  );
}

const tabName = ({ label, count }: InspectorTab): string =>
  count === undefined ? label : `${label}: ${count}`;
