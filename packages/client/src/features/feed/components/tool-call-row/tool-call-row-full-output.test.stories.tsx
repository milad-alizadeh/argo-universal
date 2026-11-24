import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import {
  FullOutputPreview,
  fullOutputServer,
  previewText,
  truncatedToolCall,
  wholeText,
} from '../../../../../mocks/feed/full-tool-output.mocks';
import { completedRead } from '../tool-call.mocks';
import { ToolCallRow } from './tool-call-row';

const meta = {
  title: 'Tests/Feed/ToolCallRow/FullOutput',
  component: ToolCallRow,
  args: { row: truncatedToolCall(completedRead) },
} satisfies Meta<typeof ToolCallRow>;

export default meta;

type Story = StoryObj<typeof meta>;

const label = 'Read /project/hello.txt';

// A closed tool call reads nothing; opening it reads its whole output once, and the preview stands in until it comes.
export const ReadsTheWholeOutputWhenOpenedAndKeepsIt: Story = {
  play: async ({ mount, canvas, userEvent, args }) => {
    const { server, client } = fullOutputServer();
    await mount(
      <FullOutputPreview client={client}>
        <ToolCallRow {...args} />
      </FullOutputPreview>,
    );
    await settleLayout('phone');
    const row = canvas.getByRole('button', { name: label });

    await expect(server.reads).toEqual([]);

    await userEvent.click(row);
    await expect(canvas.getByText(previewText)).toBeVisible();
    await waitFor(() => expect(server.reads).toHaveLength(1));

    server.answer();
    await waitFor(() => expect(canvas.getByText(wholeText)).toBeVisible());
    await expect(canvas.queryByText(previewText)).not.toBeInTheDocument();

    await userEvent.click(row);
    await waitFor(() =>
      expect(canvas.queryByText(wholeText)).not.toBeInTheDocument(),
    );
    await userEvent.click(row);
    await expect(canvas.getByText(wholeText)).toBeVisible();
    await expect(server.reads).toHaveLength(1);
  },
};

// A Server built before `blob.text` refuses the read: the row keeps showing its preview.
export const KeepsThePreviewWhenTheServerCannotReadTheWholeOutput: Story = {
  play: async ({ mount, canvas, userEvent, args }) => {
    const { server, client } = fullOutputServer();
    server.refuse();
    await mount(
      <FullOutputPreview client={client}>
        <ToolCallRow {...args} />
      </FullOutputPreview>,
    );
    await settleLayout('phone');

    await userEvent.click(canvas.getByRole('button', { name: label }));
    await waitFor(() => expect(server.reads).toHaveLength(1));
    server.answer();

    await expect(canvas.getByText(previewText)).toBeVisible();
    await expect(canvas.queryByText(wholeText)).not.toBeInTheDocument();
    await expect(server.reads).toHaveLength(1);
  },
};
