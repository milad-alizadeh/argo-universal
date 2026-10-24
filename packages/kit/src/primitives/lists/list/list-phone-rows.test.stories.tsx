import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { FieldGroup } from '#primitives/fields/field-group';
import { ListItem } from '#primitives/lists/list-item';
import { List } from './list';
import { nativeKinds } from './list-native-kinds';
import { hostsNatively } from './list-phone-rows';

const meta = {
  title: 'Tests/Design System/Primitives/Lists/List/Phone Grouped Selection',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const hosts = (props: Parameters<typeof hostsNatively>[0]): boolean =>
  hostsNatively(props, nativeKinds);

export const FieldGroupRowsAreNative: Story = {
  render: () => <></>,
  play: async () => {
    await expect(
      hosts({
        children: (
          <List.Section title="Branches" footer="Pick one">
            <FieldGroup.Value title="Current" value="main" />
            <FieldGroup.Link title="develop" onPress={fn()} />
          </List.Section>
        ),
      }),
    ).toBe(true);
  },
};

export const ListItemRowsFallBack: Story = {
  render: () => <></>,
  play: async () => {
    await expect(
      hosts({
        children: (
          <List.Section title="Items">
            <ListItem title="One" />
          </List.Section>
        ),
      }),
    ).toBe(false);
  },
};

export const SectionPropsFallBack: Story = {
  render: () => <></>,
  play: async () => {
    await expect(
      hosts({
        children: (
          <List.Section title="Items" subtitle="Two">
            <FieldGroup.Value title="Current" value="main" />
          </List.Section>
        ),
      }),
    ).toBe(false);
  },
};
