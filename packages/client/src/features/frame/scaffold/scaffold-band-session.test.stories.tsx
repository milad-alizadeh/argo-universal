import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect } from 'storybook/test';
import { page } from 'vitest/browser';
import { SessionHeader } from '#features/sessions';
import { Text } from '#primitives/content/text';
import { HostedScaffoldMock } from './hosted-scaffold.mocks';

const meta = {
  title: 'Tests/Scaffold/BandSession',
  component: HostedScaffoldMock,
  parameters: { screenPreview: true },
} satisfies Meta<typeof HostedScaffoldMock>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SessionIdentityMovesIntoTheBand: Story = {
  render: () => (
    <HostedScaffoldMock>
      <SessionHeader
        title="Build the window band"
        status="running"
        startedAt={null}
        menu={{}}
      />
      <View testID="session-feed" className="flex-1">
        <Text>Feed content</Text>
      </View>
    </HostedScaffoldMock>
  ),
  play: async ({ canvas }) => {
    await page.viewport(1440, 844);
    const band = await canvas.findByTestId('window-band');

    const title = await canvas.findByRole('heading', {
      name: 'Build the window band',
    });

    await expect(band).toContainElement(title);
    await expect(
      canvas.getByRole('button', { name: 'More', exact: true }),
    ).toBeDisabled();
    await expect(canvas.queryByTestId('session-header-bar')).toBeNull();
    await expect(canvas.getByTestId('session-feed')).toBeVisible();
  },
};
