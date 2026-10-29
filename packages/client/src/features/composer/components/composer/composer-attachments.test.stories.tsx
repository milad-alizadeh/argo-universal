import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import { recordedSessionOptions } from '@repo/mocks/app';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { fn } from 'storybook/test';
import { expect } from 'storybook/test';
import { waitFor } from 'storybook/test';
import { within } from 'storybook/test';
import { ContentLayout } from '#lib/product/content-layout';
import { composerProps } from '../../../../../mocks/composer-mock';
import { composerFiles } from '../../../../../mocks/composer-mock';
import { phoneAttachmentAction } from '../../../../../mocks/composer/attachment-actions.test.mocks';
import { attachmentMenus } from '../../../../../mocks/composer/attachment-actions.test.mocks';
import { withImages } from '../../../../../mocks/composer/attachment-actions.test.mocks';
import type { Story } from '../../../../../mocks/composer/composer-story-context.test.mocks';
import { meta as composerTestMeta } from '../../../../../mocks/composer/composer-story-context.test.mocks';
import { inspectorOpenColumn } from '../../../../../mocks/composer/draft-editing.test.mocks';
import { firstAgent } from '../../../../../mocks/composer/recorded-catalog.test.mocks';
import { Composer } from './composer';

const meta = { ...composerTestMeta, title: 'Tests/Composer/Attachments' };

export default meta;

export const CameraClosesAndCalls = phoneAttachmentAction('Camera');

export const PhotosClosesAndCalls = phoneAttachmentAction('Photos');

export const FilesClosesAndCalls = phoneAttachmentAction('Files');

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
    await settleLayout('wide');
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Attach' }),
    );
    await waitFor(() =>
      expect(
        within(document.body).getByRole('button', { name: 'Photos' }),
      ).toBeVisible(),
    );
    await expect(
      within(document.body).queryByRole('button', { name: 'Goal' }),
    ).not.toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
  },
};

export const EnvelopeWithInspectorOpen: Story = {
  args: {
    configuration: {
      agent: firstAgent,
      configOptions: recordedSessionOptions(firstAgent.id),
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
    await settleLayout('wide');
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
