import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ReactElement } from 'react';
import { View } from 'react-native';
import { expect, fn, within } from 'storybook/test';
import { createPlace, useClaimed, type Place } from '#kit/place';
import { Action } from '#primitives/actions/action';
import { ScreenBandPlaceOffer, type ScreenBand } from './screen-band';
import { ScreenStackHeader } from './screen-stack-header';
import { atWidth, screenWidths } from './screen-widths.mocks';

const meta = {
  title: 'Tests/Design System/Primitives/Scaffolds/Screen/Band',
  component: ScreenStackHeader,
} satisfies Meta<typeof ScreenStackHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

const onRename = fn();

// The place's band, drawing what the claiming header declared.
function Band({ place }: { place: Place<ScreenBand> }): ReactElement {
  const band = useClaimed(place);

  return (
    <View testID="band" className="flex-row items-center">
      {band?.title}
      {band?.menu}
    </View>
  );
}

function Host(): ReactElement {
  const [place] = useState(() => createPlace<ScreenBand>());

  return (
    <ScreenBandPlaceOffer value={place}>
      <Band place={place} />
      <ScreenStackHeader
        title="Build the band"
        actions={
          <Action label="More" icon="more">
            <Action label="Rename" icon="rename" onPress={onRename} />
          </Action>
        }
      />
    </ScreenBandPlaceOffer>
  );
}

// A page whose body is no Screen declares its header once; a wide window's band draws its title.
export const HeaderOnlyScreenDrawsItsTitleInTheBand: Story = atWidth(
  screenWidths.Wide,
  {
    render: () => <Host />,
    play: async ({ canvas }) => {
      const band = await canvas.findByTestId('band');

      await expect(band).toContainElement(
        await canvas.findByRole('heading', { name: 'Build the band' }),
      );
    },
  },
);

// The Actions the header declared work from the band.
export const HeaderOnlyScreenActionsWorkInTheBand: Story = atWidth(
  screenWidths.Wide,
  {
    render: () => <Host />,
    play: async ({ canvas, canvasElement, userEvent }) => {
      await userEvent.click(
        await canvas.findByRole('button', { name: 'More' }),
      );
      await userEvent.click(
        await within(canvasElement.ownerDocument.body).findByRole('menuitem', {
          name: 'Rename',
        }),
      );
      await expect(onRename).toHaveBeenCalledTimes(1);
    },
  },
);

// Below wide there is no band: the stack's header holds the title, so nothing is claimed.
export const NoBandBelowWide: Story = atWidth(screenWidths.Phone, {
  render: () => <Host />,
  play: async ({ canvas }) => {
    await expect(await canvas.findByTestId('band')).toBeEmptyDOMElement();
  },
});
