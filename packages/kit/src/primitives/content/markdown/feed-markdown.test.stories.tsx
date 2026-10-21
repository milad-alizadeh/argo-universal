import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { Markdown } from './markdown';

const meta = {
  title: 'Tests/Markdown/Feed',
  component: Markdown,
  args: { text: '' },
} satisfies Meta<typeof Markdown>;

export default meta;

type Story = StoryObj<typeof meta>;

// Text that looks like HTML or a link definition is drawn as written, not dropped.
function drawnAsWritten(text: string, shown: RegExp | string = text): Story {
  return {
    args: { text },
    play: async ({ canvas }) => {
      await expect(canvas.getByText(shown)).toBeVisible();
    },
  };
}

export const HtmlLikeTextIsDrawn = drawnAsWritten('<div> wraps the row, why?');

export const AComponentNameOnItsOwnLineIsDrawn = drawnAsWritten(
  '<Composer>\nholds the draft while it is typed',
  /^<Composer>\s+holds the draft while it is typed$/,
);

export const ALinkDefinitionIsDrawn = drawnAsWritten(
  '[spec]: https://argo.dev/spec',
);

export const AThematicBreakSeparatesContent: Story = {
  args: { text: 'Before\n\n---\n\nAfter' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('separator')).toBeInTheDocument();
    await expect(canvas.getByText('After')).toBeVisible();
  },
};

// Argo opens only http, https and mailto links; any other link keeps its text and opens nothing.
function linkFollowed(scheme: string, followed: boolean): Story {
  return {
    args: { text: `Open [the page](${scheme}) now` },
    play: async ({ canvas }) => {
      await expect(canvas.getByText('the page')).toBeVisible();
      const link = canvas.queryByRole('link', { name: 'the page' });
      await (followed
        ? expect(link).toBeInTheDocument()
        : expect(link).not.toBeInTheDocument());
    },
  };
}

export const AnHttpsLinkOpens = linkFollowed('https://argo.dev', true);

export const AMailLinkOpens = linkFollowed('mailto:team@argo.dev', true);

export const AScriptLinkIsText = linkFollowed('javascript:alert(1)', false);

export const AFileLinkIsText = linkFollowed('file:///etc/hosts', false);
