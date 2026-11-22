import { settleLayout } from '@repo/kit/mocks/story-layout';
import { Action } from '@repo/kit/primitives/actions/action';
import { Text } from '@repo/kit/primitives/content/text';
import {
  Screen,
  ScreenStackHeader,
} from '@repo/kit/primitives/scaffolds/screen';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, fn } from 'storybook/test';
import { SessionBandClaim } from '#features/sessions';
import { HostedScaffoldMock } from './hosted-scaffold.mocks';

const meta = {
  title: 'Tests/Frame/Scaffold/BandSession',
  component: HostedScaffoldMock,
  parameters: { screenPreview: true },
} satisfies Meta<typeof HostedScaffoldMock>;

export default meta;

type Story = StoryObj<typeof meta>;

const sessionSearchLabel = 'Search Sessions';

// The Session shares the Screen heading and leaves window controls in the band.
export const SessionUsesTheScreenHeading: Story = {
  render: () => (
    <HostedScaffoldMock
      list={
        <Screen title="Sessions" search={{ label: sessionSearchLabel }}>
          <Text>Session list</Text>
        </Screen>
      }
    >
      <ScreenStackHeader
        title="Session detail"
        actions={
          <Action label="More" icon="more">
            <Action label="Rename" icon="rename" onPress={fn()} />
          </Action>
        }
      />
      <SessionBandClaim
        title="Session detail"
        status="running"
        startedAt={null}
      />
      <View testID="session-feed" className="flex-1">
        <Text>Feed content</Text>
      </View>
    </HostedScaffoldMock>
  ),
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    const band = await canvas.findByTestId('window-band');

    const title = await canvas.findByRole('heading', {
      name: 'Session detail',
    });

    await expect(band).not.toContainElement(title);
    await expect(band).not.toContainElement(
      canvas.getByRole('button', { name: /^More$/ }),
    );
    await expect(canvas.getByTestId('session-feed')).toBeVisible();

    const explorerTitle = canvas.getByRole('heading', { name: 'Sessions' });
    await expect(explorerTitle).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: sessionSearchLabel }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Hide sidebar' }));
    await expect(
      canvas.queryByRole('heading', { name: 'Sessions' }),
    ).toBeNull();
    await expect(
      canvas.queryByRole('button', { name: sessionSearchLabel }),
    ).toBeNull();
    await expect(title).toBeVisible();
  },
};
