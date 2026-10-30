import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { logoSources } from '../../../symbols/logo-source';
import { Icon } from './icon';

const meta = {
  title: 'Tests/Design System/Primitives/Content/Icon',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const ShowsCornerStatus: Story = {
  render: () => (
    <Icon
      name="agent"
      size="sm"
      testID="agent-icon"
      status={{ tone: 'warning', pulse: true }}
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId('agent-icon-warning')).toBeVisible();
  },
};

/*
 * A drawn symbol is decoration and never a stop of its own (decorative-glyph.ts, #1505). This holds the web half of
 * that contract; the iOS and Android drawings carry the same rule and no CI draws them (ADR-0011), so VoiceOver and
 * TalkBack are the only check on those.
 */
export const HidesTheSymbolFromScreenReaders: Story = {
  render: () => <Icon name="sessions" size="sm" testID="sessions-icon" />,
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId('sessions-icon')).toHaveAttribute(
      'aria-hidden',
    );
    await expect(canvas.queryByRole('img')).toBeNull();
  },
};

export const SpeaksLogoName: Story = {
  render: () => <Icon source={logoSources.github} size="sm" />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('img', { name: 'GitHub' })).toBeVisible();
  },
};
