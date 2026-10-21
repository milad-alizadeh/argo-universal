import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, spyOn, waitFor } from 'storybook/test';
import { page } from 'vitest/browser';
import { ResourceCode as FeedCodeBlock } from '#primitives/content/code';
import { recordedFile } from '../../../../../mocks/feed-edit-mock';
import { embeddedResource } from '../../../../../mocks/feed-paper';
import { layoutWidths } from '../../../generic/each-layout';
import { settleViewport } from '../../../generic/settle-viewport';
import { longCodeBlockTitle } from '../code-block-title/code-block-title.mocks';

const codeScrollId = 'code-scroll';

const meta = {
  title: 'Tests/FeedCodeBlock',
  component: FeedCodeBlock,
  args: {
    code: recordedFile('agent-2', 'edit-states')
      .hunks.flatMap((hunk) => hunk.lines.map((line) => line.text))
      .join('\n'),
    language: 'txt',
  },
} satisfies Meta<typeof FeedCodeBlock>;

export default meta;

type Story = StoryObj<typeof FeedCodeBlock>;

export const CodeBlockScrollsInsideTheBox: Story = {
  play: async ({ canvas }) => {
    if (process.env.NODE_ENV !== 'test') return;

    for (const width of [390, 1440]) {
      await settleViewport(width);
      const box = canvas.getByTestId(codeScrollId);
      await expect(box.scrollHeight).toBeGreaterThan(box.clientHeight);
      box.scrollTop = box.scrollHeight;
      await waitFor(() => expect(box.scrollTop).toBeGreaterThan(0));
      await page.elementLocator(canvas.getByTestId('code-block-title')).hover();
      await expect(
        canvas.getByRole('button', { name: 'Copy code' }),
      ).toBeVisible();
    }
  },
};

// Where `part` of the element's text is drawn.
function textBounds(element: HTMLElement, part: string): DOMRect {
  const node = element.firstChild;

  if (!(node instanceof globalThis.Text)) throw new Error('Missing title text');
  const start = node.data.indexOf(part);
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, start + part.length);

  return range.getBoundingClientRect();
}

export const LongTitleKeepsFilenameVisible: Story = {
  args: { language: longCodeBlockTitle },
  render: (args) => (
    <View style={{ width: 240 }}>
      <FeedCodeBlock {...args} />
    </View>
  ),
  play: async ({ canvas }) => {
    if (process.env.NODE_ENV !== 'test') return;

    for (const width of [390, 1440]) {
      await settleViewport(width);
      const title = canvas.getByTestId('code-block-title');
      await expect(title.textContent).toContain(longCodeBlockTitle);
      await expect(title.scrollWidth).toBeGreaterThan(title.clientWidth);
      const filename = textBounds(title, 'useWide.ts');
      const bounds = title.getBoundingClientRect();
      await expect(filename.left).toBeGreaterThanOrEqual(bounds.left - 1);
      await expect(filename.right).toBeLessThanOrEqual(bounds.right + 1);
    }
  },
};

function copyControlFollowsHoverAndFocus(width: number): Story {
  return {
    render: (args) => (
      <View className="p-4">
        <FeedCodeBlock {...args} />
      </View>
    ),
    play: async ({ canvas, userEvent }) => {
      if (process.env.NODE_ENV !== 'test') return;
      await settleViewport(width);
      const copy = canvas.getByRole('button', { name: 'Copy code' });
      const box = canvas.getByTestId(codeScrollId).parentElement;

      if (!box) throw new Error('Missing code block');
      await page.elementLocator(box).unhover({ position: { x: 1, y: 1 } });
      await expect(copy).not.toBeVisible();
      await page.elementLocator(canvas.getByTestId(codeScrollId)).hover();
      await expect(copy).toBeVisible();
      await page.elementLocator(box).unhover({ position: { x: 1, y: 1 } });
      await expect(copy).not.toBeVisible();
      await expect(copy).not.toHaveFocus();
      await userEvent.tab();
      await expect(copy).toHaveFocus();
      await expect(copy).toBeVisible();
    },
  };
}

export const CopyControlFollowsHoverAndFocusPhone =
  copyControlFollowsHoverAndFocus(layoutWidths.phone);

export const CopyControlFollowsHoverAndFocusWide =
  copyControlFollowsHoverAndFocus(layoutWidths.wide);

function copiesResource(width: number, code?: string): Story {
  return {
    args: { uri: embeddedResource.uri, code },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      await expect(canvas.getByLabelText(embeddedResource.uri)).toBeVisible();
      await expect(canvas.queryByRole('link')).not.toBeInTheDocument();

      const clipboard = spyOn(
        navigator.clipboard,
        'writeText',
      ).mockResolvedValue();

      try {
        await userEvent.tab();

        const copy = canvas.getByRole('button', {
          name: code === undefined ? 'Copy URI' : 'Copy resource text',
        });

        await expect(copy).toHaveFocus();
        await expect(copy).toBeVisible();
        await userEvent.keyboard('{Enter}');
        await waitFor(() =>
          expect(clipboard).toHaveBeenCalledWith(code ?? embeddedResource.uri),
        );
      } finally {
        clipboard.mockRestore();
      }
    },
  };
}

export const CopiesResourceUriPhone = copiesResource(layoutWidths.phone);

export const CopiesResourceUriWide = copiesResource(layoutWidths.wide);

export const CopiesEmptyResourceTextPhone = copiesResource(
  layoutWidths.phone,
  '',
);

export const CopiesEmptyResourceTextWide = copiesResource(
  layoutWidths.wide,
  '',
);
