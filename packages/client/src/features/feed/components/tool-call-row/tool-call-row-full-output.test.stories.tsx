import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import {
  fullOutputFixture,
  RealHookPreview,
  serverBlobs,
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

// A closed tool call asks for nothing; an opened one shows its preview until the whole output comes, then shows that instead.
export const ShowsThePreviewThenTheWholeOutputOnceOpened: Story = {
  play: async ({ mount, canvas, userEvent, args }) => {
    const { Provider, asked, answer } = fullOutputFixture();

    await mount(
      <Provider>
        <ToolCallRow {...args} />
      </Provider>,
    );
    await settleLayout('phone');
    await expect(asked()).toBe(0);

    await userEvent.click(canvas.getByRole('button', { name: label }));
    await expect(canvas.getByText(previewText)).toBeVisible();
    await waitFor(() => expect(asked()).toBe(1));

    answer();
    await waitFor(() => expect(canvas.getByText(wholeText)).toBeVisible());
    await expect(canvas.queryByText(previewText)).not.toBeInTheDocument();
  },
};

// The real hook, over a Blob route that counts its reads: an opened row reads once and a reopen reads nothing, a row with content never reads its raw output, and a closed row reads nothing.
export const ReadsTheOpenedRowsContentOnceAndNothingElse: Story = {
  play: async ({ mount, canvas, userEvent, args }) => {
    const blobs = serverBlobs();

    await mount(
      <RealHookPreview blobs={blobs}>
        <ToolCallRow {...args} />
      </RealHookPreview>,
    );
    await settleLayout('phone');
    const row = canvas.getByRole('button', { name: label });

    await expect(blobs.reads()).toEqual([]);

    await userEvent.click(row);
    await waitFor(() => expect(canvas.getByText(wholeText)).toBeVisible());
    await userEvent.click(row);
    await waitFor(() =>
      expect(canvas.queryByText(wholeText)).not.toBeInTheDocument(),
    );
    await userEvent.click(row);
    await expect(canvas.getByText(wholeText)).toBeVisible();

    // One read, of the content Blob; the raw output Blob the row also names is never read.
    await expect(blobs.reads()).toEqual([blobs.contentPath]);
  },
};
