import { useRouter } from 'expo-router';
import { useState } from 'react';
import { fn } from 'storybook/test';
import { Action } from '#primitives/actions/action';
import { List } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { useStackPush } from '#story-stack';
import { Screen, ScreenMenuContext } from './index';

export const onAction = fn();

const rows = ['Item one', 'Item two', 'Item three'];

function Rows(): React.JSX.Element {
  return (
    <List>
      <List.Section>
        {rows.map((title) => (
          <ListItem key={title} title={title} />
        ))}
      </List.Section>
    </List>
  );
}

// Two buttons and an overflow menu, whose last action is danger.
export function HeaderActionsScreen(): React.JSX.Element {
  return (
    <Screen title="Title" actions={headerActions}>
      <Rows />
    </Screen>
  );
}

// A Screen reads its Actions from the element it is given, so they are declared here rather than in a component.
const headerActions = (
  <>
    <Action label="Filters" icon="filters" onPress={onAction} />
    <Action label="Archive" icon="archive" onPress={onAction} />
    <Action label="Copy link" icon="copy" onPress={onAction} />
    <Action label="Delete" icon="delete" tone="danger" onPress={onAction} />
  </>
);

export function PushScreen(): React.JSX.Element {
  return (
    <Screen title="Title">
      <List>
        <List.Section>
          <OpenDetail />
        </List.Section>
      </List>
    </Screen>
  );
}

// The root as the App draws a narrow one: its provider gives it ☰; the page it pushes is outside the provider.
export function MenuRootScreen(): React.JSX.Element {
  return (
    <ScreenMenuContext value={{ onOpen: onAction, badge: false }}>
      <PushScreen />
    </ScreenMenuContext>
  );
}

export const onSearch = fn();

const searched =
  (setValue: (text: string) => void) =>
  (text: string): void => {
    setValue(text);
    onSearch(text);
  };

export function SearchScreen(): React.JSX.Element {
  const [value, setValue] = useState('');

  return (
    <Screen
      title="Title"
      search={{ label: 'Search Items' }}
      value={value}
      onChangeText={searched(setValue)}
    >
      <Rows />
    </Screen>
  );
}

function OpenDetail(): React.JSX.Element {
  const push = useStackPush();

  return (
    <ListItem title="Open detail" disclosure onPress={() => push('detail')} />
  );
}

export function DetailScreen(): React.JSX.Element {
  const router = useRouter();

  return (
    <Screen title="Detail" onBack={() => router.back()}>
      <Rows />
    </Screen>
  );
}
