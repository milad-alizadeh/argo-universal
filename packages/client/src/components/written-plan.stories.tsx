import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { type ReactElement, useState } from 'react';
import { action } from 'storybook/actions';
import { recordedAcpContent } from '../../mocks/acp-feed-content';
import { composerProps } from '../../mocks/composer-mock';
import { longWrittenPlan } from '../../mocks/feed-paper';
import { Composer } from './composer';

const recording = recordedAcpContent('agent-1');
const fileRow = recording.rows.find(
  (row) => row.sessionUpdate === 'plan_update' && row.plan.type === 'file',
);
if (fileRow?.sessionUpdate !== 'plan_update' || fileRow.plan.type !== 'file')
  throw new Error('ACP recording needs a file Plan');
const meta = {
  title: 'Sessions/WrittenPlan',
  component: Composer,
  render: function EditableComposer(args): ReactElement {
    const [draft, setDraft] = useState(args.draft);
    return <Composer {...args} draft={draft} onDraftChange={setDraft} />;
  },
  args: composerProps({
    draft: { text: '', images: [] },
    onDraftChange: action('edit draft'),
    onAttachImages: action('attach images'),
    onSend: action('send'),
    writtenPlan: longWrittenPlan,
  }),
} satisfies Meta<typeof Composer>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Document: Story = {};
export const UriOnly: Story = { args: { writtenPlan: fileRow.plan } };
