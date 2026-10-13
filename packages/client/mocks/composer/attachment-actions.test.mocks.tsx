import { createRoot } from 'react-dom/client';
import { View } from 'react-native';
import { fn, expect, waitFor, within } from 'storybook/test';
import { wideBreakpoint } from '../../src/lib/generic/each-layout';
import { settleViewport } from '../../src/lib/generic/settle-viewport';
import { composerProps, composerImages } from '../composer-mock';
import { type Story, imageComposer } from './composer-story-context.test.mocks';

export function withImages(width: number): Story {
  return {
    render: () => <View testID="controlled-images" />,
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const root = createRoot(canvas.getByTestId('controlled-images'));
      const onDraftChange = fn();

      const props = composerProps({
        draft: { text: '', attachments: composerImages.slice(0, 1) },
        onDraftChange,
        onSend: fn(),
        onAttachImages: fn(),
      });

      try {
        root.render(imageComposer(props));
        await expect(
          await canvas.findByRole('img', { name: 'screenshot.png' }),
        ).toBeVisible();
        await expect(
          canvas.getByRole('button', { name: 'Send' }),
        ).toBeEnabled();
        await userEvent.click(
          canvas.getByRole('button', { name: 'Remove screenshot.png' }),
        );
        await expect(onDraftChange).toHaveBeenCalledWith({
          text: '',
          attachments: [],
        });
        root.render(
          imageComposer({ ...props, draft: { text: '', attachments: [] } }),
        );
        await waitFor(() =>
          expect(canvas.queryByRole('img')).not.toBeInTheDocument(),
        );
        await expect(
          canvas.getByRole('button', { name: 'Send' }),
        ).toBeDisabled();
      } finally {
        root.unmount();
      }
    },
  };
}

export const dragFiles = (
  type: 'dragover' | 'drop',
  files: File[],
): DragEvent => {
  const transfer = new DataTransfer();

  for (const file of files) transfer.items.add(file);

  return new DragEvent(type, {
    bubbles: true,
    cancelable: true,
    dataTransfer: transfer,
  });
};

export function attachmentMenus(width: number): Story {
  return {
    args: {
      onAttachCamera: fn(),
      onAttachFiles: fn(),
      onSelectSlashCommand: fn(),
      onCreateGoal: fn(),
    },
    play: async ({ canvas, userEvent, args }) => {
      const overlay = within(document.body);
      await settleViewport(width);

      const choices =
        width < wideBreakpoint()
          ? ([
              ['Camera', args.onAttachCamera],
              ['Photos', args.onAttachImages],
              ['Files', args.onAttachFiles],
            ] as const)
          : ([
              ['Files', args.onAttachFiles],
              ['Slash Commands', args.onSelectSlashCommand],
              ['Goal', args.onCreateGoal],
            ] as const);

      for (const [label, callback] of choices) {
        await userEvent.click(
          canvas.getByRole('button', {
            name: 'Attach',
          }),
        );
        await expect(
          overlay.queryByRole('button', {
            name: absentAttachmentChoice(width),
          }),
        ).not.toBeInTheDocument();
        await userEvent.click(
          await overlay.findByRole('button', { name: label }),
        );
        await waitFor(() => expect(callback).toHaveBeenCalledOnce());
        await expect(overlay.queryByRole('dialog')).not.toBeInTheDocument();
      }
    },
  };
}

function absentAttachmentChoice(width: number): string {
  return width < wideBreakpoint() ? 'Goal' : 'Camera';
}
