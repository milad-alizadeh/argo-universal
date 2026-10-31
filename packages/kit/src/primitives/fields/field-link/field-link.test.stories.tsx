import type {
  Decorator,
  Meta,
  StoryObj,
} from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, fn } from 'storybook/test';
import { FieldGroup } from '#primitives/fields/field-group';
import { FieldLink } from './field-link';

const inFieldGroupSection: Decorator = (Story): React.JSX.Element => (
  <FieldGroup>
    <FieldGroup.Section title="Section">
      <Story />
    </FieldGroup.Section>
  </FieldGroup>
);

const meta = {
  title: 'Tests/Design System/Primitives/Forms/FieldLink',
  component: FieldLink,
  args: { title: 'Licences', onPress: fn() },
  decorators: [inFieldGroupSection],
} satisfies Meta<typeof FieldLink>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Presses: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByText('Licences'));
    await expect(args.onPress).toHaveBeenCalledTimes(1);
  },
};

export const ShowsItsValue: Story = {
  args: { title: 'Projects', value: '3' },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('3')).toBeVisible();
  },
};

export const LinkIsALinkWithAChevron: Story = {
  play: async ({ canvas }) => {
    const row = canvas.getByRole('link', { name: 'Licences' });
    await expect(row.querySelector('svg')).not.toBeNull();
  },
};

export const ActionIsAButtonWithoutAChevron: Story = {
  args: { title: 'Photos', action: true },
  play: async ({ canvas, userEvent, args }) => {
    const row = canvas.getByRole('button', { name: 'Photos' });
    await expect(canvas.queryByRole('link')).toBeNull();
    await expect(row.querySelector('svg')).toBeNull();
    await userEvent.click(row);
    await expect(args.onPress).toHaveBeenCalledTimes(1);
  },
};

// Rows whose icons differ in width still start their titles on one x (#1760).
export const ActionTitlesShareOneX: Story = {
  render: (args): React.JSX.Element => (
    <FieldGroup>
      <FieldGroup.Section>
        <FieldLink {...args} title="Photos" leading="photos" action />
        <FieldLink {...args} title="Files" leading="folder" action />
        <FieldLink {...args} title="Slash Commands" leading="code" action />
      </FieldGroup.Section>
    </FieldGroup>
  ),
  // The story draws its own FieldGroup around three rows, so the meta's one-row wrapper is dropped.
  decorators: [],
  play: async ({ canvas }) => {
    const lefts = ['Photos', 'Files', 'Slash Commands'].map(
      (title) => canvas.getByText(title).getBoundingClientRect().left,
    );

    await expect(Math.max(...lefts) - Math.min(...lefts)).toBeLessThan(0.5);
  },
};

export const ActionWithoutAnIconKeepsItsValue: Story = {
  args: { title: 'Sort', value: 'Newest', action: true },
  play: async ({ canvas }) => {
    const row = canvas.getByRole('button', { name: 'Sort, Newest' });

    await expect(canvas.getByText('Newest')).toBeVisible();
    await expect(row.querySelector('svg')).toBeNull();
  },
};

export const DisabledDoesNothing: Story = {
  args: { title: 'Goal', action: true, disabled: true },
  play: async ({ canvas, userEvent, args }) => {
    const row = canvas.getByRole('button', { name: 'Goal' });

    await userEvent.click(row, { pointerEventsCheck: 0 });
    await expect(args.onPress).not.toHaveBeenCalled();
  },
};
