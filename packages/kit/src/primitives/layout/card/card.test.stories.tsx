import fixtures from '@repo/mocks/plugins/svg.json' with { type: 'json' };
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, userEvent } from 'storybook/test';
import { IconButton } from '#primitives/actions/icon-button';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import { Svg } from '#primitives/visual';
import { Card } from './card';

const mediaXml = fixtures.valid[0]?.xml ?? '';

const title = 'api-gateway';

const pressed = fn();

const removed = fn();

const meta = {
  title: 'Tests/Design System/Primitives/Layout/Card',
  component: Card,
  args: { title },
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

export const TitleOnly: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('group', { name: title })).toBeVisible();
    await expect(canvas.queryByRole('button')).toBeNull();
  },
};

export const Anatomy: Story = {
  args: {
    subtitle: 'Production',
    icon: <Icon role="row" name="server" />,
    children: <Text>Deployed 12 min ago</Text>,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Production')).toBeVisible();
    await expect(canvas.getByText('Deployed 12 min ago')).toBeVisible();
  },
};

function activation(activate: (button: HTMLElement) => Promise<void>): Story {
  return {
    args: { subtitle: 'Production', onPress: pressed },
    play: async ({ canvas }) => {
      await activate(
        canvas.getByRole('button', { name: 'api-gateway, Production' }),
      );
      await expect(pressed).toHaveBeenCalledOnce();
    },
  };
}

export const PointerActivation = activation(async (button) =>
  userEvent.click(button),
);

function keyboardActivation(key: string): Story {
  return activation(async (button) => {
    button.focus();
    await userEvent.keyboard(key);
  });
}

export const EnterActivation = keyboardActivation('{Enter}');

export const SpaceActivation = keyboardActivation(' ');

export const SpokenName: Story = {
  args: { accessibilityLabel: 'Open api-gateway', onPress: fn() },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: 'Open api-gateway' }),
    ).toBeVisible();
  },
};

export const Media: Story = {
  args: {
    media: <Svg xml={mediaXml} label="Service map" />,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Service map')).toBeVisible();
    await expect(canvas.getByRole('group', { name: title })).toBeVisible();
  },
};

export const ActionPressesAlone: Story = {
  args: {
    onPress: pressed,
    actions: (
      <IconButton
        icon="delete"
        variant="ghost"
        accessibilityLabel="Remove api-gateway"
        onPress={removed}
      />
    ),
  },
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Remove api-gateway' }),
    );
    await expect(removed).toHaveBeenCalledOnce();
    await expect(pressed).not.toHaveBeenCalled();
  },
};
