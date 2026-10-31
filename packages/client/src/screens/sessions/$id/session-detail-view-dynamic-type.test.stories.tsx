import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect } from 'storybook/test';
import { inRoomAboveKeyboard } from '../../../../mocks/composer/scaled-type.test.mocks';
import { FramedSessionPreview } from './session-detail-view-framed.mocks';
import { idleSession } from './session-detail-view.mocks';

const wrappingDraft =
  'please fix the failing build now okay and then also update the tests for the login flow thanks';

const meta = {
  title: 'Tests/Screens/Sessions/Session/DynamicType',
  parameters: { screenPreview: true },
  render: (): React.JSX.Element => (
    <FramedSessionPreview
      state="open"
      {...idleSession}
      composer={{
        ...idleSession.composer,
        draft: { text: wrappingDraft, attachments: [] },
      }}
    />
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

/*
 * With a draft that wraps, an open Session has its Composer inside the top of the room above the keyboard, not pushed up under the
 * status bar: the Composer gives height up rather than running on past the pane (#1529, #1606).
 */
const keepsTopInRoom = (scaled: boolean): Story => ({
  play: async ({ canvas, canvasElement }) =>
    inRoomAboveKeyboard(scaled, canvasElement, async () => {
      const column = await canvas.findByTestId('composer-column');

      await expect(column.getBoundingClientRect().top).toBeGreaterThanOrEqual(
        0,
      );
    }),
});

export const DefaultTextSize = keepsTopInRoom(false);

export const LargestTextSize = keepsTopInRoom(true);
