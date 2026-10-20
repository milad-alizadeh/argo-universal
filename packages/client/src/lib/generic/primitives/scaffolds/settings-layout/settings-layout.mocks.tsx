import { useState, type ReactElement, type ReactNode } from 'react';
import { Text } from '#primitives/content/text';
import { ListSection } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { Page } from '#primitives/scaffolds/page';
import { EmptyState } from '#primitives/status/empty-state';
import { SettingsLayout } from './settings-layout';
import type {
  SettingsLayoutItem,
  SettingsLayoutProps,
  SettingsLayoutSections,
} from './settings-layout-props';

export const serverGroup = 'Server';

export const deviceGroup = 'This device';

export const noPages = 'No matching settings';

const page = (item: Omit<SettingsLayoutItem, 'href'>): SettingsLayoutItem => ({
  ...item,
  href: `/settings/${item.id}`,
});

const projects = page({
  id: 'projects',
  title: 'Projects',
  icon: 'folder',
  value: '3',
});

const agents = page({
  id: 'agents',
  title: 'Agents',
  icon: 'agent',
  value: '2',
});

const appearance = page({
  id: 'appearance',
  title: 'Appearance',
  icon: 'appearance',
  value: 'System',
});

const notifications = page({
  id: 'notifications',
  title: 'Notifications',
  icon: 'notifications',
});

const pages = [projects, agents, appearance, notifications];

// Settings in two groups; a phone leaves out Notifications.
const groups = (wide: boolean): SettingsLayoutSections => [
  { title: serverGroup, items: [projects, agents] },
  {
    title: deviceGroup,
    items: wide ? [appearance, notifications] : [appearance],
  },
];

export const exampleSections: SettingsLayoutProps['sections'] = {
  compact: groups(false),
  wide: groups(true),
};

const titleOf = (id: string): string =>
  pages.find((shown) => shown.id === id)?.title ?? id;

// The page a row opens: its title and a line about it.
function ExamplePage({ id }: { id: string }): ReactElement {
  return (
    <Page title={titleOf(id)}>
      <Text>{`The ${titleOf(id)} page.`}</Text>
    </Page>
  );
}

const empty = <EmptyState icon="search" title={noPages} />;

export const pinnedGroup = 'Pinned';

// A group whose row opens no page, as Settings' Theme with its inline Picker.
export const examplePinned = (
  <ListSection title={pinnedGroup}>
    <ListItem title="Version" value="1.0" />
  </ListSection>
);

interface ExampleProps {
  initial?: string;
  sections?: SettingsLayoutProps['sections'];
  pinned?: ReactNode;
}

// Settings holding the page it shows; a row opens its page, as the App's router does.
export function ExampleSettingsLayout(props: ExampleProps): ReactElement {
  const [shown, setShown] = useState(props.initial);
  const sections = props.sections ?? exampleSections;

  return (
    <SettingsLayout
      {...{ sections, empty }}
      pinned={props.pinned}
      selected={shown}
      onSelect={(href) => setShown(href.split('/').at(-1))}
    >
      {shown && <ExamplePage id={shown} />}
    </SettingsLayout>
  );
}
