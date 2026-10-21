import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { type ReactElement, useState } from 'react';
import { action } from 'storybook/actions';
import { SessionColumn } from '#lib/product/session-column';
import { composerProps } from '../../../../../mocks/composer-mock';
import { Composer } from '../composer/composer';
import {
  markdownWrittenPlan,
  planFileWrittenPlan,
} from './written-plan-fixtures';

const meta = {
  title: 'Composer/WrittenPlan',
  decorators: [
    (Story): React.JSX.Element => (
      <SessionColumn>
        <Story />
      </SessionColumn>
    ),
  ],
  component: Composer,
  render: function EditableComposer(args): ReactElement {
    const [draft, setDraft] = useState(args.draft);

    return <Composer {...args} draft={draft} onDraftChange={setDraft} />;
  },
  args: composerProps({
    draft: { text: '', attachments: [] },
    onDraftChange: action('edit draft'),
    onAttachImages: action('attach images'),
    onSend: action('send'),
    writtenPlan: markdownWrittenPlan,
  }),
  /*
   * ComposerProps is declared in composer-types.ts, which react-docgen cannot follow
   * (docs/agents/storybook.md, "Docgen"), so the descriptions live here with the prop domain.
   */
  argTypes: {
    writtenPlan: {
      control: false,
      description:
        'The Plan the Agent wrote: markdown it wrote out, or the file it wrote it to.',
    },
    draft: { control: false },
    status: { control: false },
    configuration: { control: false },
    onDraftChange: { control: false },
    onAttachImages: { control: false },
    onSend: { control: false },
  },
} satisfies Meta<typeof Composer>;

export default meta;

type Story = StoryObj<typeof meta>;

// Markdown the Agent wrote out: the trigger takes its title and the Plan reads at full height.
export const Document: Story = { args: { writtenPlan: markdownWrittenPlan } };

// A Plan written to a file: the trigger names the file and its card is as tall as itself.
export const UriOnly: Story = { args: { writtenPlan: planFileWrittenPlan } };
