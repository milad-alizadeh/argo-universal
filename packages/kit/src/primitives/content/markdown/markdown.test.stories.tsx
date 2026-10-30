import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { Markdown } from './index';

const meta = {
  title: 'Tests/Design System/Primitives/Content/Markdown',
  component: Markdown,
  args: { text: '# Overview\n\n## Details\n\n3. Third\n4. Fourth' },
} satisfies Meta<typeof Markdown>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Headings: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { level: 1, name: 'Overview' }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('heading', { level: 2, name: 'Details' }),
    ).toBeVisible();
  },
};

export const TableContent: Story = {
  args: { text: '| Name | Value |\n| --- | --- |\n| **Item** | `42` |' },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('columnheader', { name: 'Name' }),
    ).toBeVisible();
    await expect(canvas.getByRole('cell', { name: 'Item' })).toBeVisible();
    await expect(canvas.getByRole('cell', { name: '42' })).toBeVisible();
  },
};

export const FenceUsesCode: Story = {
  args: { text: '```sh\necho ready\n```' },
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId('code-text')).toHaveTextContent(
      'echo ready',
    );
    await expect(
      canvas.getByRole('button', { name: 'Copy code' }),
    ).toBeInTheDocument();
  },
};

export const Streaming: Story = {
  args: { text: 'Text arriving', streaming: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Text arriving')).toBeVisible();
    await expect(canvas.getByTestId('streaming-caret')).toBeVisible();
  },
};

export const QuoteAndInlineContent: Story = {
  args: { text: '> **Strong**, *emphasis*, ~~removed~~, and `value`.' },
  play: async ({ canvas }) => {
    for (const label of ['Strong', 'emphasis', 'removed', 'value'])
      await expect(canvas.getByText(label)).toBeVisible();
  },
};

export const FormattedTableHeader: Story = {
  args: { text: '| **Name** | *Value* |\n| --- | --- |\n| Item | 42 |' },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('columnheader', { name: 'Name' }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('columnheader', { name: 'Value' }),
    ).toBeVisible();
  },
};

export const OrderedListStart: Story = {
  args: { text: '3. Third\n4. Fourth' },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('3.')).toBeVisible();
    await expect(canvas.getByText('4.')).toBeVisible();
  },
};

// A link's href is Agent text, not an App route: only a URL Argo follows draws as a link.
function inertLink(href: string): Story {
  return {
    args: { text: `[qa-note.txt](${href})` },
    play: async ({ canvas }) => {
      await expect(canvas.getByText('qa-note.txt')).toBeVisible();
      await expect(canvas.queryByRole('link')).not.toBeInTheDocument();
    },
  };
}

export const AbsolutePathLinkIsInert = inertLink('/tmp/checkout/qa-note.txt');

export const RelativePathLinkIsInert = inertLink('src/qa-note.txt');

export const PathWithEncodedSpacesLinkIsInert = inertLink(
  '/tmp/my%20checkout/qa%20note.txt',
);

export const UnicodePathLinkIsInert = inertLink(
  '/tmp/caf%C3%A9/note-%E6%97%A5.txt',
);

export const AppRouteLookingLinkIsInert = inertLink('/settings');

export const WebLinkStillOpens: Story = {
  args: { text: '[a page](https://example.com/a%20b)' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: 'a page' })).toHaveAttribute(
      'href',
      'https://example.com/a%20b',
    );
  },
};
