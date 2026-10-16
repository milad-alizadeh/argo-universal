import { newSessionCatalogs } from '@repo/mocks/app';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { Platform } from 'react-native';
import { action } from 'storybook/actions';
import { SessionColumn } from '#lib/product/session-column';
import { SessionLayout } from '#lib/product/session-layout';
import {
  composerProps,
  type ComposerMockProps,
} from '../../../../../mocks/composer-mock';
import { attachmentSelectionFailureMessage } from '../../state/attachment-draft';
import { Composer } from './composer';
import { ComposerOverview } from './composer-overview';

const [firstAgent] = newSessionCatalogs.bothAvailable;

if (!firstAgent) throw new Error('Recorded catalog needs an available Agent.');

const meta = {
  title: 'Composer/Composer',
  component: Composer,
  render: (args): React.JSX.Element => (
    <SessionColumn>
      <Composer {...composerProps(args)} />
    </SessionColumn>
  ),
  parameters: {
    previewPadding: false,
    screenPreview: Platform.OS !== 'web',
  },
  args: {
    initialAgent: firstAgent.id,
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
      options: newSessionCatalogs.bothAvailable.map((agent) => agent.id),
      control: {
        type: 'select',
        labels: Object.fromEntries(
          newSessionCatalogs.bothAvailable.map((agent) => [
            agent.id,
            agent.name,
          ]),
        ),
      },
    },
  },
} satisfies Meta<ComposerMockProps>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ImageSelectionFailed: Story = {
  parameters: { screenPreview: true },
  args: {
    draft: { text: 'Build this screen using the brief.', attachments: [] },
    error: attachmentSelectionFailureMessage,
  },
  render: (args) => (
    <SessionLayout
      header={null}
      feed={null}
      composer={<Composer {...composerProps(args)} />}
    />
  ),
};

export const Overview: Story = {
  name: 'Composer',
  render: (args) => <ComposerOverview {...args} />,
};
