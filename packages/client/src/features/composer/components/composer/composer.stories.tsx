import { newSessionCatalogs } from '@repo/mocks/app';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { Platform, View } from 'react-native';
import { action } from 'storybook/actions';
import { SessionColumn } from '#lib/product/session-column';
import {
  composerProps,
  type ComposerMockProps,
} from '../../../../../mocks/composer-mock';
import { attachmentSelectionFailureMessage } from '../../state/attachment-draft';
import { Composer } from './composer';
import { ComposerOverview } from './composer-overview';

const [firstAgent] = newSessionCatalogs.bothReady;
if (!firstAgent) throw new Error('Recorded catalog needs an available Agent.');

const meta = {
  title: 'Composer/Composer',
  decorators: [
    (Story): React.JSX.Element => (
      <SessionColumn>
        <Story />
      </SessionColumn>
    ),
  ],
  component: Composer,
  render: (args): React.JSX.Element => <Composer {...composerProps(args)} />,
  parameters: {
    previewPadding: false,
    screenPreview: Platform.OS !== 'web',
  },
  args: {
    initialAgent: firstAgent.agent,
    draft: { text: '', attachments: [] },
    onDraftChange: action('edit draft'),
    onAttachImages: action('attach images'),
    onAttachFiles: action('attach files'),
    onDropFiles: action('drop files'),
    onSelectSlashCommand: action('slash commands'),
    onCreateGoal: action('create goal'),
    onSend: action('send prompt'),
  },
  argTypes: {
    initialAgent: {
      name: 'Agent',
      options: newSessionCatalogs.bothReady.map((agent) => agent.agent),
      control: {
        type: 'select',
        labels: Object.fromEntries(
          newSessionCatalogs.bothReady.map((agent) => [
            agent.agent,
            agent.label,
          ]),
        ),
      },
    },
  },
} satisfies Meta<ComposerMockProps>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ImageSelectionFailed: Story = {
  args: {
    draft: { text: 'Build this screen using the brief.', attachments: [] },
    error: attachmentSelectionFailureMessage,
  },
  render: (args) => (
    <View className="w-full items-center p-4">
      <View className="w-full max-w-composer">
        <Composer {...composerProps({ ...args })} />
      </View>
    </View>
  ),
};

export const Overview: Story = {
  name: 'Composer',
  render: (args) => <ComposerOverview {...args} />,
};
