import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { logoSources } from '../../../symbols/logo-source';
import { IconButton } from './icon-button';

const meta = { title: 'Tests/IconButton' } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const onPress = fn();

export const AccessibleName: Story = {
  render: () => <IconButton icon="more" accessibilityLabel="More actions" />,
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: 'More actions' }),
    ).toBeVisible();
  },
};

// The button speaks its own name; the logo inside it is not announced again.
export const LogoTakesButtonName: Story = {
  render: () => (
    <IconButton
      iconSource={logoSources.github}
      accessibilityLabel="Repository"
    />
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: 'Repository' }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole('img', { name: 'GitHub' }),
    ).not.toBeInTheDocument();
  },
};

export const Loading: Story = {
  render: () => (
    <IconButton
      icon="more"
      accessibilityLabel="More actions"
      loading
      onPress={onPress}
    />
  ),
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'More actions' });
    await expect(button).toBeDisabled();
    await expect(button).toHaveAttribute('aria-busy', 'true');
    button.click();
    await expect(onPress).not.toHaveBeenCalled();
  },
};
