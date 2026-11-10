import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import { WorkbenchScaffold } from './scaffold-workbench.mocks';

const meta = {
  title: 'Tests/Frame/Scaffold/SidebarIntent',
  component: WorkbenchScaffold,
  parameters: { screenPreview: true },
  beforeEach: (): Promise<void> => settleLayout(1180),
} satisfies Meta<typeof WorkbenchScaffold>;

export default meta;

type Story = StoryObj<typeof meta>;

const hideSidebar = 'Hide sidebar';

const showSidebar = 'Show sidebar';

const workbenchId = 'desktop-workbench';

// Without the list, the page's gutter holds the Workbench from 1544.
export const HidingSidebarMakesRoomForTheWorkbench: Story = {
  beforeEach: (): Promise<void> => settleLayout(1544),
  play: async ({ canvas, userEvent }) => {
    await waitFor(() =>
      expect(canvas.getByTestId(workbenchId)).not.toBeVisible(),
    );
    await userEvent.click(
      await canvas.findByRole('button', { name: hideSidebar }),
    );
    await waitFor(() => expect(canvas.getByTestId(workbenchId)).toBeVisible());
    await expect(
      canvas.getByRole('button', { name: showSidebar }),
    ).toBeVisible();
    await expect(canvas.getByRole('textbox', { name: 'Draft' })).toHaveValue(
      'Keep my draft',
    );
  },
};

export const WideningSidebarDoesNotHideIt: Story = {
  beforeEach: (): Promise<void> => settleLayout('wide'),
  args: { inspectorOpen: false },
  play: async ({ canvas, userEvent }) => {
    await expect(
      await canvas.findByRole('button', { name: hideSidebar }),
    ).toBeVisible();
    const divider = canvas.getByRole('separator', { name: 'Resize sidebar' });
    divider.focus();
    await userEvent.keyboard('{End}');
    await waitFor(() =>
      expect(divider).not.toHaveAttribute('aria-valuenow', '312'),
    );
    await expect(
      canvas.getByRole('button', { name: hideSidebar }),
    ).toBeVisible();
  },
};

export const UnavailableSidebarWaitsForSpaceBesideTheInspector: Story = {
  args: { inspectorOpen: true },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('button', { name: showSidebar }),
    ).toBeDisabled();
    await settleLayout('wide');
    // The sidebar re-enables on the next layout pass, which a slow runner reaches after the resize.
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: hideSidebar })).toBeEnabled(),
    );
    await expect(
      canvas.getByRole('button', { name: hideSidebar }),
    ).toBeVisible();
    await expect(canvas.getByText('Branch files')).toBeVisible();
    await waitFor(() =>
      expect(canvas.getByTestId(workbenchId)).not.toBeVisible(),
    );
  },
};
