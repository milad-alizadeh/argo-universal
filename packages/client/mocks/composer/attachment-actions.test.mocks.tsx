import {
  layoutWidths,
  settleLayout,
  wideBreakpoint,
} from '@repo/kit/mocks/story-layout';
import { createRoot } from 'react-dom/client';
import { View } from 'react-native';
import { fn, expect, waitFor, within } from 'storybook/test';
import { composerProps, composerImages } from '../composer-mock';
import { type Story, imageComposer } from './composer-story-context.test.mocks';

export function withImages(width: number): Story {
  return {
    render: () => <View testID="controlled-images" />,
    play: async ({ canvas, userEvent }) => {
      await settleLayout(width);
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
          expect(
            canvas.queryByRole('img', { name: 'screenshot.png' }),
          ).not.toBeInTheDocument(),
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

export function attachmentMenus(width: number): Story {
  return {
    args: {
      onAttachCamera: fn(),
      onAttachFiles: fn(),
      onCreateGoal: fn(),
    },
    play: async ({ canvas, userEvent, args }) => {
      const overlay = within(document.body);
      await settleLayout(width);

      const choices =
        width < wideBreakpoint()
          ? ([
              ['Camera', args.onAttachCamera],
              ['Photos', args.onAttachImages],
              ['Files', args.onAttachFiles],
            ] as const)
          : ([
              ['Files', args.onAttachFiles],
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

// Each phone action gets its own fixture and checks the callback after the sheet closes.
export function phoneAttachmentAction(
  label: 'Camera' | 'Photos' | 'Files',
): Story {
  const camera = fn();
  const photos = fn();
  const files = fn();
  const callbacks = { Camera: camera, Photos: photos, Files: files };

  return {
    args: {
      onAttachCamera: camera,
      onAttachImages: photos,
      onAttachFiles: files,
    },
    play: async ({ canvas, userEvent }) => {
      await settleLayout(layoutWidths.phone);
      await userEvent.click(canvas.getByRole('button', { name: 'Attach' }));
      const overlay = within(document.body);
      await userEvent.click(
        await overlay.findByRole('button', { name: label }),
      );
      await waitFor(() => expect(callbacks[label]).toHaveBeenCalledOnce());
      await waitFor(() =>
        expect(overlay.queryByRole('dialog')).not.toBeInTheDocument(),
      );

      for (const other of (['Camera', 'Photos', 'Files'] as const).filter(
        (name) => name !== label,
      )) {
        await expect(callbacks[other]).not.toHaveBeenCalled();
      }
    },
  };
}
