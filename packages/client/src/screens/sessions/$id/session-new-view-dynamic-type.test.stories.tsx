import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect } from 'storybook/test';
import { inRoomAboveKeyboard } from '../../../../mocks/composer/scaled-type.test.mocks';
import { SessionNewView } from './session-new-view';
import { exampleProject, readyNewSession } from './session-new-view.mocks';

const wrappingDraft =
  'please fix the failing build now okay and then also update the tests for the login flow thanks';

const meta = {
  title: 'Tests/Screens/Sessions/New Session/DynamicType',
  parameters: { screenPreview: true },
  render: (): React.JSX.Element => (
    <SessionNewView
      state="ready"
      {...readyNewSession}
      draft={{ text: wrappingDraft, attachments: [] }}
    />
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

/*
 * With a draft that wraps, the page has its Project pill inside the top of the room above the keyboard, not pushed up under the status
 * bar: the Composer gives height up rather than running on past the pane (#1606).
 */
const keepsTopInRoom = (scaled: boolean): Story => ({
  play: async ({ canvas, canvasElement }) =>
    inRoomAboveKeyboard(scaled, canvasElement, async () => {
      const project = await canvas.findByRole('button', {
        name: `Project: ${exampleProject.name}`,
      });

      await expect(project.getBoundingClientRect().top).toBeGreaterThanOrEqual(
        0,
      );
    }),
});

export const DefaultTextSize = keepsTopInRoom(false);

export const LargestTextSize = keepsTopInRoom(true);
