import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import { Grid } from '#primitives/layout/grid';
import { Card } from './card';
import {
  anatomyCard,
  collapsedCard,
  expandedCard,
  footerCard,
  mediaCard,
  titleOnlyCard,
} from './card-fixtures';

const deployCard = <Card {...anatomyCard} />;

const workerCard = (
  <Card
    icon={<Icon size="md" name="server" />}
    title="worker"
    subtitle="Staging"
  >
    <Text>Deployed 2 hours ago by Sam Lee</Text>
  </Card>
);

const meta = {
  title: 'Design System/Primitives/Layout/Card',
  component: Card,
  argTypes: kitArgTypes('Card'),
  args: titleOnlyCard,
  // A card fills the width its container gives it, so each story sets that container's width here, not in the card.
  decorators: [
    (Story): React.JSX.Element => (
      <View className="w-full max-w-3xl">
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

export const TitleOnly: Story = { args: titleOnlyCard };

export const Anatomy: Story = { args: anatomyCard };

export const Media: Story = { args: mediaCard };

// Hover and focus are live: the whole title line is the trigger, and the actions lane stays beside it.
export const Collapsed: Story = { args: collapsedCard };

export const Expanded: Story = { args: expandedCard };

// The footer folds with the body.
export const Footnote: Story = { args: footerCard };

// Tighter padding for cards stacked in a narrow column, such as the Workbench.
export const Compact: Story = { args: { ...footerCard, density: 'compact' } };

// The press count is live, so this state keeps its own render.
export const Pressable: Story = { render: () => <PressableCard /> };

// Cards in one row share the tallest one's height, so this state draws the row.
export const InAGrid: Story = {
  render: () => (
    <Grid columns={3} gap={3}>
      {deployCard}
      {workerCard}
      <Card icon={<Icon size="md" name="web" />} title="web" />
    </Grid>
  ),
};

function PressableCard(): React.JSX.Element {
  const [opened, setOpened] = useState(0);

  return (
    <Card
      icon={<Icon size="md" name="activity" />}
      title="Builds"
      subtitle={`Opened ${opened} times`}
      onPress={() => setOpened((count) => count + 1)}
    >
      <Text>Press the card to open its builds.</Text>
    </Card>
  );
}
