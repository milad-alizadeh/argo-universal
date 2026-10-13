import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import type { ReactElement } from 'react';
import { fn } from 'storybook/test';
import { SessionColumn } from '#lib/product/session-column';
import { useEditableComposerDraft } from '../../../../../mocks/written-plan-composer-draft';
import {
  openingWrittenPlan,
  readingLongWrittenPlan,
} from '../../../../../mocks/written-plan-stories';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import type { MockAgent } from '../../../../lib/product/feed-message.mocks';
import { Composer } from '../composer/composer';

const meta = {
  title: 'Tests/WrittenPlan',
  decorators: [
    (Story): React.JSX.Element => (
      <SessionColumn>
        <Story />
      </SessionColumn>
    ),
  ],
  component: Composer,
  render: function EditableComposer(args): ReactElement {
    const editableDraft = useEditableComposerDraft(args);
    return <Composer {...args} {...editableDraft} />;
  },
  args: {
    draft: { text: '', attachments: [] },
    onDraftChange: fn(),
    onAttachImages: fn(),
    onSend: fn(),
  },
} satisfies Meta<typeof Composer>;
export default meta;
type Story = StoryObj<typeof Composer>;

function opensWrittenPlan(
  width: number,
  agent: MockAgent,
  form: 'markdown' | 'file',
): Story {
  return openingWrittenPlan({ width, agent, form }, meta.args);
}
export const MarkdownFirstAgentPhone = opensWrittenPlan(
  layoutWidths.phone,
  'agent-1',
  'markdown',
);
export const MarkdownFirstAgentWide = opensWrittenPlan(
  layoutWidths.wide,
  'agent-1',
  'markdown',
);
export const MarkdownSecondAgentPhone = opensWrittenPlan(
  layoutWidths.phone,
  'agent-2',
  'markdown',
);
export const MarkdownSecondAgentWide = opensWrittenPlan(
  layoutWidths.wide,
  'agent-2',
  'markdown',
);
export const FileFirstAgentPhone = opensWrittenPlan(
  layoutWidths.phone,
  'agent-1',
  'file',
);
export const FileFirstAgentWide = opensWrittenPlan(
  layoutWidths.wide,
  'agent-1',
  'file',
);
export const FileSecondAgentPhone = opensWrittenPlan(
  layoutWidths.phone,
  'agent-2',
  'file',
);
export const FileSecondAgentWide = opensWrittenPlan(
  layoutWidths.wide,
  'agent-2',
  'file',
);

function readsLongWrittenPlan(width: number, agent: MockAgent): Story {
  return readingLongWrittenPlan({ width, agent }, meta.args);
}
export const LongFirstAgentPhone = readsLongWrittenPlan(
  layoutWidths.phone,
  'agent-1',
);
export const LongFirstAgentWide = readsLongWrittenPlan(
  layoutWidths.wide,
  'agent-1',
);
export const LongSecondAgentPhone = readsLongWrittenPlan(
  layoutWidths.phone,
  'agent-2',
);
export const LongSecondAgentWide = readsLongWrittenPlan(
  layoutWidths.wide,
  'agent-2',
);
