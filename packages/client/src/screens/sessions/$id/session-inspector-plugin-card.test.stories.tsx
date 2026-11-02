import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { type JSX, useState } from 'react';
import { View } from 'react-native';
import { expect, screen, within } from 'storybook/test';
import { useSessionPanels } from '#features/sessions';
import { pluginCardKey } from './sections/plugin-card-section';
import {
  coverageCard,
  coverageCardSummary,
  issueCardFullView,
  issueTrackerCard,
} from './sections/plugin-card.mocks';
import { SessionInspector } from './session-inspector';

const issueKey = pluginCardKey(
  issueTrackerCard.pluginId,
  issueTrackerCard.card.id,
);

const coverageKey = pluginCardKey(coverageCard.pluginId, coverageCard.card.id);

// A phone has no Workbench column: a Plugin card opens as the Inspector's sheet, as Argo's Sections do.
function CardSheet({ open }: { open: readonly string[] }): JSX.Element {
  const panels = useSessionPanels([issueKey, coverageKey]);
  const [opened, setOpened] = useState(false);

  if (!opened) {
    for (const key of open) panels.select(key);
    setOpened(true);
  }

  return (
    <View className="h-96">
      <SessionInspector
        panels={panels}
        pluginCards={[issueTrackerCard, coverageCard]}
      />
    </View>
  );
}

const meta = {
  title: 'Tests/Screens/Sessions/Session/InspectorPluginCard',
  render: ({ open }): JSX.Element => <CardSheet open={open} />,
  args: { open: [issueKey] },
  beforeEach: (): Promise<void> => settleLayout('phone'),
} satisfies Meta<{ open: readonly string[] }>;

export default meta;

type Story = StoryObj<typeof meta>;

// The sheet draws the card's full view, which the Plugin draws.
export const PhoneSheetDrawsTheCardsFullView: Story = {
  play: async () => {
    await expect(await screen.findByText(issueCardFullView)).toBeVisible();
  },
};

// A card with no full view has only itself to show, so the sheet draws the card's own page.
export const PhoneSheetFallsBackToTheCard: Story = {
  args: { open: [coverageKey] },
  play: async () => {
    await expect(await screen.findByText(coverageCardSummary)).toBeVisible();
  },
};

// The Inspector's tab bar names each card, as it names Argo's Sections.
export const TabsNameEachCard: Story = {
  args: { open: [issueKey, coverageKey] },
  beforeEach: (): Promise<void> => settleLayout('wide'),
  play: async ({ canvas }) => {
    const tabs = within(await canvas.findByRole('tablist'));

    await expect(tabs.getByRole('tab', { name: 'Issue' })).toBeVisible();
    await expect(tabs.getByRole('tab', { name: 'Coverage' })).toBeVisible();
  },
};
