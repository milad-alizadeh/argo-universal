import type { ReactElement } from 'react';
import { Action, ActionList } from '#primitives/actions/action-list';

const sections = [
  {
    title: 'Order',
    actions: [
      { label: 'Newest', icon: 'arrow-down' },
      { label: 'Oldest', icon: 'arrow-up' },
    ],
  },
  { title: 'Group', actions: [{ label: 'By Project', icon: 'screens' }] },
] as const;

type Choose = (value: string) => void;

// A header submenu: its icon, a count badge, and titled Sections as its children; each Action reports its label.
export function exampleSubmenu(choose: Choose): ReactElement {
  return (
    <Action
      key="sort"
      label="Sort"
      icon="filter-list"
      badge={{ kind: 'count', count: 2 }}
    >
      {sections.map((section) => submenuSection(section, choose))}
    </Action>
  );
}

function submenuSection(
  section: (typeof sections)[number],
  choose: Choose,
): ReactElement {
  return (
    <ActionList.Section key={section.title} title={section.title}>
      {section.actions.map((action) => reporting(action, choose))}
    </ActionList.Section>
  );
}

function reporting(
  action: (typeof sections)[number]['actions'][number],
  choose: Choose,
): ReactElement {
  return (
    <Action
      key={action.label}
      {...action}
      onPress={() => choose(action.label)}
    />
  );
}
