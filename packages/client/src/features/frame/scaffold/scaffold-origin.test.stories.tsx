import { settleLayout } from '@repo/kit/mocks/story-layout';
import { Text } from '@repo/kit/primitives/content/text';
import { ScreenStackHeader } from '@repo/kit/primitives/scaffolds/screen';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { JSX } from 'react';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { expect, within } from 'storybook/test';
import { SessionBandClaim } from '#features/sessions';
import { HostedScaffoldMock } from './hosted-scaffold.mocks';
import { WorkbenchScaffold } from './scaffold-workbench.mocks';

const meta = {
  title: 'Tests/Frame/Scaffold/Origin',
  component: WorkbenchScaffold,
  parameters: { screenPreview: true },
  beforeEach: (): Promise<void> => settleLayout(1180),
} satisfies Meta<typeof WorkbenchScaffold>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NoInspectorDisablesTheInspectorToggle: Story = {
  beforeEach: (): Promise<void> => settleLayout('wide'),
  render: (): JSX.Element => (
    <HostedScaffoldMock>
      <ScreenStackHeader title="No Inspector offered" />
      <SessionBandClaim
        title="No Inspector offered"
        status="idle"
        startedAt={null}
      />
      <Text>No Inspector offered</Text>
    </HostedScaffoldMock>
  ),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('button', { name: 'Show Inspector' }),
    ).toBeDisabled();
  },
};

export const SafeAreaKeepsBandAndPanesClear: Story = {
  beforeEach: (): Promise<void> => settleLayout(1920),
  args: { inspectorOpen: true },
  decorators: [
    (Story): JSX.Element => (
      <SafeAreaInsetsContext value={{ top: 24, bottom: 0, left: 0, right: 0 }}>
        <Story />
      </SafeAreaInsetsContext>
    ),
  ],
  play: async ({ canvas }) => {
    const band = await canvas.findByTestId('window-band');
    const sidebar = canvas.getByTestId('desktop-list');
    const inspector = canvas.getByTestId('desktop-inspector');
    await expect(band.getBoundingClientRect().top).toBeGreaterThanOrEqual(24);
    await expect(inspector.getBoundingClientRect().top).toBe(
      sidebar.getBoundingClientRect().top,
    );
    await expect(
      within(band).getByRole('button', { name: 'Hide sidebar' }),
    ).toBeVisible();
  },
};
