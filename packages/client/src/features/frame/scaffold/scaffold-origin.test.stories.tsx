import { Text } from '@repo/kit/primitives/content/text';
import { settleViewport } from '@repo/kit/settle-viewport';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { JSX } from 'react';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { expect, within } from 'storybook/test';
import { HostedScaffoldMock } from './hosted-scaffold.mocks';
import { WorkbenchScaffold } from './scaffold-workbench.mocks';

const meta = {
  title: 'Tests/Frame/Scaffold/Origin',
  component: WorkbenchScaffold,
  parameters: { screenPreview: true },
  beforeEach: (): Promise<void> => settleViewport(1180),
} satisfies Meta<typeof WorkbenchScaffold>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NoInspectorDisablesStage: Story = {
  beforeEach: (): Promise<void> => settleViewport(1440),
  render: (): JSX.Element => (
    <HostedScaffoldMock>
      <Text>No Inspector offered</Text>
    </HostedScaffoldMock>
  ),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('button', { name: 'Show Stage' }),
    ).toBeDisabled();
  },
};

export const SafeAreaKeepsBandAndPanesClear: Story = {
  beforeEach: (): Promise<void> => settleViewport(1920),
  args: { stageOpen: true },
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
    const stage = canvas.getByTestId('desktop-inspector');
    await expect(band.getBoundingClientRect().top).toBeGreaterThanOrEqual(24);
    await expect(stage.getBoundingClientRect().top).toBe(
      sidebar.getBoundingClientRect().top,
    );
    await expect(
      within(band).getByRole('button', { name: 'Hide sidebar' }),
    ).toBeVisible();
  },
};
