import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { severalPullRequests } from '../../../features/sessions/components/session-pull-request.mocks';
import { ChangesSheet, changedFiles } from './session-changes-sheet.mocks';
import { withPullRequests } from './session-detail-view-pull-request.mocks';
import { idleSession } from './session-detail-view.mocks';

const meta = {
  title: 'Screens/Sessions/Session/ChangesSheet',
  component: ChangesSheet,
  tags: ['!autodocs'],
  parameters: { screenPreview: true },
  globals: { mode: 'light', viewport: { value: 'phone' } },
  args: { catalog: changedFiles },
} satisfies Meta<typeof ChangesSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

// A phone's Changes sheet: the Checkout's changed files alone.
export const FilesOnly: Story = {};

// The Session's pull requests lead the sheet, drawn as the Workbench's Changes card draws them, with the files under them.
export const PullRequestsAndFiles: Story = {
  args: {
    header: withPullRequests(idleSession, severalPullRequests).header,
  },
};
