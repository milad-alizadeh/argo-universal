import { settleOverlays } from '@repo/kit/mocks/settle-overlays';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { expect, fn, waitFor, within } from 'storybook/test';
import { Action } from '#primitives/actions/action';
import { Text } from '#primitives/content/text';
import { ScreenStackHeader } from './screen-stack-header';
import { atWidth, screenWidths } from './screen-widths.mocks';

const meta = {
  title: 'Tests/Design System/Primitives/Scaffolds/Screen/Stack/Header',
  component: ScreenStackHeader,
} satisfies Meta<typeof ScreenStackHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

const onRename = fn();

function Host(): ReactElement {
  return (
    <ScreenStackHeader
      title="Review the build"
      actions={
        <Action label="More" icon="more">
          <Action label="Rename" icon="rename" onPress={onRename} />
        </Action>
      }
    />
  );
}

export const HeaderOnlyScreenActionsWorkInTheHeading: Story = atWidth(
  screenWidths.Wide,
  {
    render: () => <Host />,
    play: async ({ canvas, canvasElement, userEvent }) => {
      await userEvent.click(
        await canvas.findByRole('button', { name: 'More' }),
      );

      const rename = await within(canvasElement.ownerDocument.body).findByRole(
        'menuitem',
        { name: 'Rename' },
      );

      await settleOverlays(rename);
      await userEvent.click(rename);
      await expect(onRename).toHaveBeenCalledTimes(1);
    },
  },
);

// With no navigator, the header-only Screen leaves a narrow preview's layout alone.
export const NoHeadingBelowWide: Story = atWidth(screenWidths.Phone, {
  render: () => <Host />,
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('heading')).not.toBeInTheDocument();
  },
});

const onPlace = fn();

// A header-only Screen whose title picks a place and whose options hold a line of text.
function PickerHost(): ReactElement {
  return (
    <ScreenStackHeader
      title="Review the build"
      titleMenu={
        <Action.Section key="places">
          <Action label="Another place" onPress={onPlace} />
        </Action.Section>
      }
      options={<Text>Page options</Text>}
      optionsBadge={{ kind: 'count', count: 2 }}
    />
  );
}

// The shared heading draws the title menu and the Options button.
export const HeaderOnlyScreenTitleMenuAndOptionsInTheHeading: Story = atWidth(
  screenWidths.Wide,
  {
    render: () => <PickerHost />,
    play: async ({ canvas, canvasElement, userEvent }) => {
      const page = within(canvasElement.ownerDocument.body);
      const heading = await canvas.findByRole('heading', { level: 1 });

      await userEvent.click(
        within(heading).getByRole('button', { name: 'Review the build' }),
      );

      const place = await page.findByRole('menuitem', {
        name: 'Another place',
      });

      await settleOverlays(place);
      await userEvent.click(place);
      await expect(onPlace).toHaveBeenCalledTimes(1);

      await userEvent.click(canvas.getByRole('button', { name: 'Options, 2' }));
      await waitFor(() => expect(page.getByText('Page options')).toBeVisible());
    },
  },
);
