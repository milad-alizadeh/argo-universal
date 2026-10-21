import type { Meta } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, fn, waitFor } from 'storybook/test';
import { Composer } from '#features/composer';
import { ContentLayout } from '#lib/product/content-layout';
import { composerProps } from '../../../../mocks/composer-mock';
import { allowOnceLabel } from '../../../../mocks/requests/permission/permission-story-context.test.mocks';
import {
  permissionMock,
  recordedPermission,
} from '../../../../mocks/requests/recorded-requests';
import { contentWideMin } from '../../../lib/generic/each-layout';
import { settleViewport } from '../../../lib/generic/settle-viewport';
import {
  pressInspectorButton,
  resizeInspectorLabel,
} from './scaffold-controls.mocks';
import {
  controlledPlay,
  narrowDesktopWidth,
  preservedDraft,
  scaffoldMeta,
  type ScaffoldPlayContext,
  type ScaffoldStory,
} from './scaffold-test.mocks';
import { ScaffoldMock } from './scaffold.mocks';

const meta = {
  title: 'Tests/Scaffold/Width',
  ...scaffoldMeta,
} satisfies Meta<typeof ScaffoldMock>;

export default meta;

type Canvas = ScaffoldPlayContext['canvas'];

const allow = (canvas: Canvas): HTMLElement =>
  canvas.getByRole('button', { name: allowOnceLabel });

async function waitForAllow(canvas: Canvas): Promise<void> {
  await waitFor(() => expect(allow(canvas)).toBeVisible());
}

async function expectSessionLabel(canvas: Canvas): Promise<void> {
  await expect(
    await canvas.findByText('session', { exact: true }),
  ).toBeVisible();
}

async function waitForSessionLabelGone(canvas: Canvas): Promise<void> {
  await waitFor(() =>
    expect(
      canvas.queryByText('session', { exact: true }),
    ).not.toBeInTheDocument(),
  );
}

async function waitUntilWide(content: HTMLElement): Promise<void> {
  await waitFor(() =>
    expect(content.getBoundingClientRect().width).toBeGreaterThanOrEqual(
      contentWideMin(),
    ),
  );
}

async function waitUntilNarrow(content: HTMLElement): Promise<void> {
  await waitFor(() =>
    expect(content.getBoundingClientRect().width).toBeLessThan(
      contentWideMin(),
    ),
  );
}

export const MainContentUsesAvailableWidth: ScaffoldStory = {
  args: {
    children: (
      <ContentLayout testID="responsive-main-content">
        <View className="flex-1" />
        <View className="items-center px-4 pb-4">
          <Composer
            {...composerProps({
              sessionStarted: true,
              draft: { text: preservedDraft, attachments: [] },
              onDraftChange: fn(),
              onAttachImages: fn(),
              onSend: fn(),
              permissionRequest: {
                request: recordedPermission(permissionMock),
                state: { kind: 'open' },
                onAnswer: fn(),
              },
            })}
          />
        </View>
      </ContentLayout>
    ),
  },
  play: controlledPlay(async (context, controlled) => {
    const { canvas, userEvent } = context;
    await settleViewport(narrowDesktopWidth);
    const content = canvas.getByTestId('responsive-main-content');
    await waitForAllow(canvas);
    await expectSessionLabel(canvas);
    await controlled.render({ inspectorState: 'open' });
    // The list folds first, preserving the column until the reader explicitly widens the Stage.
    await waitUntilWide(content);
    await expectSessionLabel(canvas);
    await expect(canvas.getByTestId('desktop-list')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    canvas.getByRole('separator', { name: resizeInspectorLabel }).focus();
    await userEvent.keyboard('{ArrowLeft}'.repeat(40));
    await waitUntilNarrow(content);
    await waitForSessionLabelGone(canvas);
    await waitForAllow(canvas);
    await expect(
      allow(canvas).getBoundingClientRect().right,
    ).toBeLessThanOrEqual(content.getBoundingClientRect().right);
    await userEvent.keyboard('{ArrowRight}'.repeat(40));
    await waitUntilWide(content);
    await waitForAllow(canvas);
    await expectSessionLabel(canvas);
    await pressInspectorButton(context, controlled, 'closed');
    await waitForAllow(canvas);
    await expect(canvas.getByTestId('desktop-list')).toHaveAttribute(
      'aria-hidden',
      'false',
    );
    await expect(window.innerWidth).toBe(narrowDesktopWidth);
  }),
};
