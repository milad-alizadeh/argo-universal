import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Icon } from '#primitives/content/icon';
import { ListItem } from '#primitives/lists/list-item';
import { List } from './list';

const sections = (
  <>
    <List.Section title="Section one" footer="Footer">
      <ListItem title="Item" leading={<Icon role="body" name="agent" />} />
      <ListItem title="Item" subtitle="Subtitle" />
    </List.Section>
    <List.Section title="Section two">
      <ListItem title="Item" subtitle="Subtitle" />
    </List.Section>
  </>
);

const meta = {
  title: 'Design System/Primitives/Lists/List',
  component: List,
  args: { maxHeight: 400, children: sections },
  argTypes: kitArgTypes('List'),
} satisfies Meta<typeof List>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Plain: Story = { args: { appearance: 'plain' } };

export const Grouped: Story = { args: { appearance: 'grouped' } };

export const Cards: Story = { args: { appearance: 'cards' } };
