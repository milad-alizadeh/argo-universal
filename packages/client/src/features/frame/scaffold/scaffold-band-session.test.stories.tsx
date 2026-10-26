import { Action } from '@repo/kit/primitives/actions/action';
import { Text } from '@repo/kit/primitives/content/text';
import { ScreenStackHeader } from '@repo/kit/primitives/scaffolds/screen';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, fn } from 'storybook/test';
import { page } from 'vitest/browser';
import { SessionHeader } from '#features/sessions';
import { HostedScaffoldMock } from './hosted-scaffold.mocks';

const meta = {
  title: 'Tests/Frame/Scaffold/BandSession',
  component: HostedScaffoldMock,
  parameters: { screenPreview: true },
} satisfies Meta<typeof HostedScaffoldMock>;

export default meta;

type Story = StoryObj<typeof meta>;

// A Screen's header, declared once, is the band's on a wide window: its title and Actions.
export const SessionIdentityMovesIntoTheBand: Story = {
  render: () => (
    <HostedScaffoldMock>
      <ScreenStackHeader
        title="Build the window band"
        actions={
          <Action label="More" icon="more">
            <Action label="Rename" icon="rename" onPress={fn()} />
          </Action>
        }
      />
      <SessionHeader
        title="Build the window band"
        status="running"
        startedAt={null}
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
    await expect(band).toContainElement(
      canvas.getByRole('button', { name: /^More$/ }),
    );
    await expect(canvas.getByTestId('session-feed')).toBeVisible();
  },
};
