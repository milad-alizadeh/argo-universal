import type { WireNode } from '@repo/contracts/plugins/wire';
import { emptyPage } from '@repo/contracts/plugins/wire-empty-page';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { type ReactElement, useState, useSyncExternalStore } from 'react';
import { Pressable, Text } from 'react-native';
import { expect, userEvent } from 'storybook/test';
import { useSessionPanels } from '#features/sessions';
import { HeldCardStore } from './held-card-store';
import { HeldCardPages, type UsePage } from './plugin-card-pages';
import { pluginCardKey } from './sections/plugin-card-section';

const cardKey = pluginCardKey('notes', 'notes');

const card = { cardKey, pluginId: 'notes', path: '/notes' };

const text: WireNode = {
  type: 'Text',
  key: '0',
  props: { children: 'A note' },
  children: [],
  slots: {},
};

// Each story's Session is its own, so the panels one leaves in memory never reach another.
let sessions = 0;

const nextSessionId = (): string => {
  sessions += 1;

  return `session-${sessions}`;
};

const noCard = 'No card';

const cardDrawn = 'Card drawn';

const tabOpen = 'Tab open';

const tabClosed = 'Tab closed';

const fill = 'Fill';

const noop = (): Promise<void> => Promise.resolve();

type Answer = 'waiting' | 'filled' | 'empty';

const rootOf = (answer: Answer): WireNode | null => {
  if (answer === 'waiting') return null;

  return answer === 'filled' ? text : emptyPage();
};

// The Session's card pages, mounted fresh each time `generation` changes, as a Session page that mounts again.
function MountedCards({
  sessionId,
  answer,
}: {
  sessionId: string;
  answer: Answer;
}): ReactElement {
  const [store] = useState(() => new HeldCardStore());
  const filled = useSyncExternalStore(store.subscribe, store.filled);
  const usePage: UsePage = () => ({ root: rootOf(answer), onPageCall: noop });

  return (
    <>
      <HeldCardPages
        store={store}
        usePage={usePage}
        opening={{ sessionId, projectId: 'project' }}
        cards={[card]}
      />
      <Text>{filled.includes(cardKey) ? cardDrawn : noCard}</Text>
    </>
  );
}

const button = (label: string, onPress: () => void): ReactElement => (
  <Pressable accessibilityRole="button" onPress={onPress}>
    <Text>{label}</Text>
  </Pressable>
);

// A Session that stays open while the Plugin's answer changes, with the Inspector tab the card owns.
function Harness(): ReactElement {
  const [sessionId] = useState(nextSessionId);
  const [answer, setAnswer] = useState<Answer>('waiting');
  const [generation, setGeneration] = useState(0);
  const panels = useSessionPanels([cardKey], sessionId);

  return (
    <>
      <MountedCards key={generation} sessionId={sessionId} answer={answer} />
      <Text>{panels.state.tabs.includes(cardKey) ? tabOpen : tabClosed}</Text>
      {button(fill, () => setAnswer('filled'))}
      {button('Empty', () => setAnswer('empty'))}
      {button('Open tab', () => panels.select(cardKey))}
      {button('Remount', () => setGeneration((count) => count + 1))}
      {button('Empty and remount', () => {
        setAnswer('empty');
        setGeneration((count) => count + 1);
      })}
    </>
  );
}

const meta = {
  title: 'Tests/Screens/Sessions/Session/PluginCardPages',
  render: (): ReactElement => <Harness />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const ACardComesInAndGoesWithItsTabWhileTheSessionStaysOpen: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText(noCard)).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: fill }));
    await expect(await canvas.findByText(cardDrawn)).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Open tab' }));
    await expect(await canvas.findByText(tabOpen)).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Empty' }));
    await expect(await canvas.findByText(noCard)).toBeVisible();
    await expect(await canvas.findByText(tabClosed)).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: fill }));
    await expect(await canvas.findByText(cardDrawn)).toBeVisible();
    await expect(canvas.getByText(tabClosed)).toBeVisible();
  },
};

export const AFirstEmptyAnswerAfterARemountClosesTheTab: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: fill }));
    await userEvent.click(canvas.getByRole('button', { name: 'Open tab' }));
    await expect(await canvas.findByText(tabOpen)).toBeVisible();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Empty and remount' }),
    );
    await expect(await canvas.findByText(tabClosed)).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: fill }));
    await expect(await canvas.findByText(cardDrawn)).toBeVisible();
    await expect(canvas.getByText(tabClosed)).toBeVisible();
  },
};

export const ACardStillWaitingKeepsItsTab: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Open tab' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Remount' }));
    await expect(canvas.getByText(noCard)).toBeVisible();
    await expect(canvas.getByText(tabOpen)).toBeVisible();
  },
};
