import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { DesktopShellMock } from '../../mocks/desktop-shell-mock';
import { recordedFile } from '../../mocks/feed-edit-mock';
import { DesktopShell, type DesktopShellProps } from './DesktopShell';
import { DiffView } from './DiffView';

const meta = {
  title: 'Shell/DesktopShell',
  component: DesktopShell,
  parameters: { screenPreview: true },
  argTypes: {
    showInspectorControls: { control: false, table: { disable: true } },
    selectedSection: {
      control: 'select',
      options: ['sessions', 'issues', 'atlas', 'settings'],
    },
    inspectorState: {
      control: 'select',
      options: ['closed', 'open', 'expanded'],
    },
    sidebarShown: { control: 'boolean' },
    attentionCount: { control: 'number' },
  },
  render: (args) => <DesktopShellMock {...args} />,
  args: {
    showInspectorControls: false,
    selectedSection: 'sessions',
    attentionCount: 1,
    sidebarShown: true,
    inspectorState: 'closed',
    listHeader: null,
    list: null,
    detailHeader: null,
    children: null,
    inspectorHeader: null,
    inspector: null,
    onSectionChange: action('section changed'),
    onSidebarShownChange: action('sidebar changed'),
    onInspectorStateChange: action('Inspector changed'),
  },
} satisfies Meta<DesktopShellProps & { showInspectorControls?: boolean }>;

export default meta;
type Story = StoryObj<typeof meta>;

// The rail and dividers drive the shell; controls set the section, sidebar, Inspector and attention count.
export const Overview: Story = { name: 'DesktopShell' };

// Changed files in the Inspector: one list of file headers and lines that fades under the toolbar.
export const InspectorFiles: Story = {
  name: 'Inspector files',
  args: {
    inspectorState: 'open',
    inspector: (
      <View>
        {(
          [
            recordedFile('agent-2', 'edit-states'),
            recordedFile('agent-1'),
            recordedFile('agent-1', 'edit-and-command', 'add'),
            recordedFile('agent-2', 'edit-states', 'delete'),
          ] as const
        ).map((file) => (
          <DiffView key={file.path} file={file} />
        ))}
      </View>
    ),
  },
};
