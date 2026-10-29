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
import { attachmentSelectionFailureMessage } from '../../utils/attachment-draft';
import { Composer } from './composer';
import {
  attachedImageComposer,
  disabledComposer,
  emptyComposer,
  multiLineComposer,
  oversizedAttachmentComposer,
  planlessSessionComposer,
  readyComposer,
  runningTurnComposer,
  scrollableDraftComposer,
  sendingComposer,
  startedSessionComposer,
  slashSuggestionsComposer,
} from './composer-fixtures';
import { SuggestionComposer } from './composer-suggestions.mocks';

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
    ...emptyComposer,
    initialAgent: firstAgent.id,
    onDraftChange: action('edit draft'),
    onAttachImages: action('attach images'),
    onAttachFiles: action('attach files'),
    onCreateGoal: action('create goal'),
    onSend: action('send prompt'),
    onStop: action('stop Turn'),
  },
  /*
   * ComposerProps is declared in composer-types.ts, which react-docgen cannot follow
   * (docs/agents/storybook.md, "Docgen"), so the descriptions live here with the prop domain.
   */
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
    slashCommands: { control: false },
    draft: {
      control: false,
      description: 'The prompt being written, and what is attached to it.',
    },
    status: {
      control: false,
      description: "The Session's Plan, Subagents, Shells, context and usage.",
    },
    configuration: {
      control: false,
      description: "The Session's Agent, its options and its checkout.",
    },
    writtenPlan: {
      control: false,
      description: "A written Plan, in the Composer's tray above the card.",
    },
    permissionRequest: { control: false },
    callout: { control: false },
    placeholder: { control: 'text' },
    sending: {
      control: 'boolean',
      description: 'The prompt is on its way.',
    },
    disabled: { control: 'boolean' },
    sendable: {
      control: 'boolean',
      description: 'The Connection can take a prompt.',
    },
    error: { control: 'text', description: 'Raised as an error toast.' },
    errorKey: { control: 'text' },
    onDraftChange: { control: false },
    onAttachImages: { control: false },
    onAttachCamera: { control: false },
    onAttachFiles: { control: false },
    onCreateGoal: { control: false },
    onSend: { control: false },
    onStop: { control: false },
  },
} satisfies Meta<ComposerMockProps>;

export default meta;

type Story = StoryObj<typeof meta>;

// Nothing written yet: Send is blocked.
export const Empty: Story = { args: emptyComposer };

// A prompt with something in it: Send is ready.
export const Ready: Story = { args: readyComposer };

// A draft that wraps: the field grows to hold every line.
export const MultiLine: Story = { args: multiLineComposer };

// A draft past the max height: the envelope scrolls.
export const ScrollableDraft: Story = { args: scrollableDraftComposer };

// The prompt is on its way.
export const Sending: Story = { args: sendingComposer };

// Inactive: the field, the toolbar and the trays all go quiet.
export const Disabled: Story = { args: disabledComposer };

// The Turn is running, so Send becomes Stop.
export const TurnRunning: Story = { args: runningTurnComposer };

// An attachment grows a row of tiles above the field.
export const Attachments: Story = { args: attachedImageComposer };

// An attachment past the upload limit keeps Send blocked and raises its toast.
export const OversizedAttachment: Story = {
  args: oversizedAttachmentComposer,
};

// Inside a Session: the Plan tray sits above the card and the status tray below it.
export const InSession: Story = { args: startedSessionComposer };

// A Session with no Plan: the tray above the card goes.
export const NoPlan: Story = { args: planlessSessionComposer };

// Choosing an image failed: the Composer raises the failure as a toast.
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

export const Suggestions: Story = {
  args: slashSuggestionsComposer,
  parameters: { screenPreview: true },
  render: (args) => (
    <SessionLayout
      header={null}
      feed={null}
      composer={<SuggestionComposer {...composerProps(args)} />}
    />
  ),
};
