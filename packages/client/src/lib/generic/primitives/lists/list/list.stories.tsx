import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { Icon } from '#primitives/content/icon';
import { ListItem } from '#primitives/lists/list-item';
import { Variation, Variations } from '../../../variations';
import { List } from './list';

const meta = {
  title: 'Design System/Primitives/Lists/List',
  component: List,
} satisfies Meta<typeof List>;

export default meta;

const sections = (
  <>
    <List.Section title="Sessions" footer="Recent work">
      <ListItem
        title="Build the Session layout"
        leading={<Icon role="body" name="agent" />}
      />
      <ListItem title="Answer review comments" subtitle="Waiting for input" />
    </List.Section>
    <List.Section title="CI runs">
      <ListItem title="Deploy web" subtitle="main · Fix cache headers" />
    </List.Section>
  </>
);

function Example({
  appearance,
}: {
  appearance: 'plain' | 'grouped' | 'cards';
}): React.JSX.Element {
  return (
    <List appearance={appearance} maxHeight={400}>
      {sections}
    </List>
  );
}

export const Overview: StoryObj<typeof meta> = {
  name: 'List',
  render: () => (
    <Variations>
      {(['plain', 'grouped', 'cards'] as const).map((appearance) => (
        <Variation key={appearance} label={appearance}>
          <Example appearance={appearance} />
        </Variation>
      ))}
    </Variations>
  ),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findAllByText('Build the Session layout'),
    ).toHaveLength(3);
  },
};
