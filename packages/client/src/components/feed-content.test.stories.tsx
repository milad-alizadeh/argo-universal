import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { expect } from 'storybook/test';
import { AcpFeedContentPreview } from '../../mocks/acp-feed-content-preview';
import { layoutWidths } from '../../mocks/each-layout';
import {
  recordedAgentMessage,
  type MockAgent,
} from '../../mocks/feed-message-mock';
import { settleViewport } from '../../mocks/settle-viewport';
import { FeedItem } from './feed-item';

const meta = {
  title: 'Tests/FeedContent',
  component: FeedItem,
  parameters: { screenPreview: true },
  args: {
    item: {
      type: 'row',
      row: recordedAgentMessage('agent-1', 'markdown-answer'),
    },
    imageUrl: (): string => '',
  },
  render: (): React.JSX.Element => <View />,
} satisfies Meta<typeof FeedItem>;
export default meta;
type Story = StoryObj<typeof meta>;

const projectGuideTitle = 'Project guide';
const supportedContent = (width: number, agent: MockAgent): Story => ({
  render: (): React.JSX.Element => <AcpFeedContentPreview agent={agent} />,
  play: async ({ canvas, userEvent }) => {
    await settleViewport(width);
    await expect(canvas.getByText(projectGuideTitle)).toBeVisible();
    await expect(canvas.getByText('file:///project/guide.md')).toBeVisible();
    await expect(canvas.getByText('Embedded result')).toBeVisible();
    await expect(canvas.getByText('Unsupported image content')).toBeVisible();
    await expect(canvas.getByText('Context almost full')).toBeVisible();
    await expect(
      canvas.getByText('Unknown severity: future-severity'),
    ).toBeVisible();
    await expect(canvas.getByText('Compacting context')).toBeVisible();
    await expect(canvas.getByText('Live context summary')).toBeVisible();
    await expect(canvas.getByText('Compaction could not finish')).toBeVisible();
    await expect(
      canvas.getByText('Unknown compaction status: constructor'),
    ).toBeVisible();
    await expect(canvas.getByText('file:///project/plan.md')).toBeVisible();
    await expect(canvas.getByText('Read-only Plan')).toBeVisible();
    await expect(
      canvas.queryByRole('button', { name: 'Approve' }),
    ).not.toBeInTheDocument();
    await expect(canvas.queryByRole('link')).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: /Lookup/ }));
    await expect(canvas.getByText('Tool reference')).toBeVisible();
    await expect(
      canvas.getByText('Unsupported terminal content'),
    ).toBeVisible();
    await expect(
      canvas
        .getByText('Before reference')
        .compareDocumentPosition(canvas.getByText(projectGuideTitle)) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    await expect(
      canvas
        .getByText('Project guide')
        .compareDocumentPosition(canvas.getByText('After reference')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  },
});
export const FirstAgentPhone = supportedContent(layoutWidths.phone, 'agent-1');
export const FirstAgentWide = supportedContent(layoutWidths.wide, 'agent-1');
export const SecondAgentPhone = supportedContent(layoutWidths.phone, 'agent-2');
export const SecondAgentWide = supportedContent(layoutWidths.wide, 'agent-2');
