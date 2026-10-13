import { newSessionCatalogs, recordedSessionOptions } from '@repo/mocks/app';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { fn } from 'storybook/test';
import { expect } from 'storybook/test';
import { waitFor } from 'storybook/test';
import { within } from 'storybook/test';
import { ContentLayout } from '#lib/product/content-layout';
import { composerProps } from '../../../../../mocks/composer-mock';
import { composerFiles } from '../../../../../mocks/composer-mock';
import { dragFiles } from '../../../../../mocks/composer/attachment-actions.test.mocks';
import { attachmentMenus } from '../../../../../mocks/composer/attachment-actions.test.mocks';
import { withImages } from '../../../../../mocks/composer/attachment-actions.test.mocks';
import type { Story } from '../../../../../mocks/composer/composer-story-context.test.mocks';
import { meta as composerTestMeta } from '../../../../../mocks/composer/composer-story-context.test.mocks';
import { inspectorOpenColumn } from '../../../../../mocks/composer/draft-editing.test.mocks';
import { firstAgent } from '../../../../../mocks/composer/recorded-catalog.test.mocks';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { Composer } from './composer';
const meta = { ...composerTestMeta, title: 'Tests/Composer' };
export default meta;
export const DropFiles: Story = {
  args: { onDropFiles: fn() },
  play: async ({ canvas, args }) => {
    const message = await canvas.findByRole('textbox');
    const file = new File(['# Notes'], 'notes.md', { type: 'text/markdown' });
    const over = dragFiles('dragover', [file]);
    message.dispatchEvent(over);
    await expect(over.defaultPrevented).toBe(true);
    const drop = dragFiles('drop', [file]);
    message.dispatchEvent(drop);
    await expect(drop.defaultPrevented).toBe(true);
    await expect(args.onDropFiles).toHaveBeenCalledWith({
      files: [file],
      folders: 0,
    });
  },
};
export const AttachmentMenusPhone = attachmentMenus(layoutWidths.phone);
export const AttachmentMenusWide = attachmentMenus(layoutWidths.wide);
export const AttachmentInNarrowContent: Story = {
  render: (args): ReactElement => (
    <View style={{ width: layoutWidths.phone }}>
      <ContentLayout>
        <Composer {...composerProps(args)} />
      </ContentLayout>
    </View>
  ),
  play: async ({ canvas, userEvent }): Promise<void> => {
    await settleViewport(layoutWidths.wide);
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Attach' }),
    );
    await waitFor(() =>
      expect(
        within(document.body).getByRole('button', { name: 'Photos' }),
      ).toBeVisible(),
    );
    await expect(
      within(document.body).queryByRole('button', { name: 'Slash Commands' }),
    ).not.toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
  },
};
export const EnvelopeWithInspectorOpen: Story = {
  args: {
    configuration: {
      agents: newSessionCatalogs.bothAvailable,
      agent: firstAgent.agent,
      configOptions: recordedSessionOptions(firstAgent.agent),
      onConfigChange: fn(),
      checkout: {
        branch: 'main',
        newWorktree: false,
        onNewWorktreeChange: fn(),
      },
    },
  },
  render: (args): ReactElement => (
    <View style={{ width: inspectorOpenColumn }}>
      <ContentLayout>
        <Composer {...composerProps(args)} />
      </ContentLayout>
    </View>
  ),
  play: async ({ canvas }): Promise<void> => {
    await settleViewport(layoutWidths.wide);
    await expect(
      await canvas.findByRole('button', { name: 'Checkout' }),
    ).toBeVisible();
  },
};
export const WithImagesPhone = withImages(layoutWidths.phone);
export const WithImagesWide = withImages(layoutWidths.wide);
export const WithFiles: Story = {
  args: { draft: { text: '', attachments: composerFiles } },
  play: async ({ canvas, userEvent, args }) => {
    await expect(
      await canvas.findByRole('img', { name: 'release-notes.md' }),
    ).toHaveTextContent('# Release notes');
    await expect(
      canvas.getByRole('img', { name: 'quarterly-report.pdf' }),
    ).toHaveTextContent('PDF');
    await expect(canvas.getByRole('button', { name: 'Send' })).toBeEnabled();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Remove quarterly-report.pdf' }),
    );
    await expect(args.onDraftChange).toHaveBeenCalledWith({
      text: '',
      attachments: composerFiles.slice(0, 1),
    });
  },
};
