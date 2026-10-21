import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ReactElement, type ReactNode } from 'react';
import { expect, waitFor, within } from 'storybook/test';
import { layoutWidths } from '#lib/generic/each-layout';
import { settleViewport } from '#lib/generic/settle-viewport';
import { LinkPreviewCard } from './link-preview-card';
import { LinkPreviewContext } from './link-preview-context';
import { Link } from './link-preview-story-link';
import { webPreview } from './link-preview.mocks';

const href = 'https://example.com/guide';

const meta = {
  title: 'Tests/Design System/Primitives/LinkPreview',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

function DelayedPreview(): ReactElement {
  const [resolve, setResolve] = useState<((value: ReactNode) => void) | null>(
    null,
  );

  const [source] = useState(() => ({
    load: (): Promise<ReactNode> =>
      new Promise((ready) => setResolve(() => ready)),
  }));

  return (
    <LinkPreviewContext value={source}>
      <p>
        See <Link href={href}>the guide</Link> for details.
      </p>
      <button onClick={() => resolve?.(<LinkPreviewCard data={webPreview} />)}>
        Finish loading
      </button>
    </LinkPreviewContext>
  );
}

export const TooltipBecomesCardWhenReadyWide: Story = {
  render: () => <DelayedPreview />,
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.wide);
    const page = within(document.body);
    await userEvent.hover(canvas.getByRole('link'));
    await expect(page.queryByRole('tooltip')).not.toBeInTheDocument();
    await expect(await page.findByRole('tooltip')).toHaveTextContent(href);
    // Complete the Server reply without moving focus or the pointer away from the Link.
    canvas.getByRole('button', { name: 'Finish loading' }).click();
    await expect(
      await page.findByRole('dialog', { name: 'Link preview' }),
    ).toHaveTextContent(webPreview.title);
    await expect(page.queryByRole('tooltip')).not.toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(page.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  },
};

const failed = { load: async (): Promise<ReactNode> => null };

export const MissingPreviewKeepsUrlTooltipWide: Story = {
  render: () => (
    <LinkPreviewContext value={failed}>
      <p>
        See <Link href={href}>the guide</Link>.
      </p>
    </LinkPreviewContext>
  ),
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.wide);
    const page = within(document.body);
    await userEvent.hover(canvas.getByRole('link'));
    await expect(await page.findByRole('tooltip')).toHaveTextContent(href);
    await userEvent.unhover(canvas.getByRole('link'));
    await waitFor(() =>
      expect(page.queryByRole('tooltip')).not.toBeInTheDocument(),
    );
  },
};

const ready = {
  load: async (): Promise<ReactNode> => <LinkPreviewCard data={webPreview} />,
};

export const KeyboardFocusKeepsNavigationWide: Story = {
  render: () => (
    <LinkPreviewContext value={ready}>
      <Link href={href}>the guide</Link>
    </LinkPreviewContext>
  ),
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.wide);
    await userEvent.tab();
    const link = canvas.getByRole('link');
    await expect(link).toHaveFocus();
    await expect(link).toHaveAttribute('href', href);

    const preview = await within(document.body).findByRole('dialog', {
      name: 'Link preview',
    });

    await waitFor(() => expect(preview).toBeVisible());
    await expect(link).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(
        within(document.body).queryByRole('dialog'),
      ).not.toBeInTheDocument(),
    );
    await expect(link).toHaveFocus();
  },
};
