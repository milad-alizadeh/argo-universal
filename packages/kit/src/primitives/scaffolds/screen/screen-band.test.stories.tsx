import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ReactElement } from 'react';
import { View } from 'react-native';
import { expect, fn, within } from 'storybook/test';
import { createPlace, useClaimed, type Place } from '#kit/place';
import { Action } from '#primitives/actions/action';
import { Text } from '#primitives/content/text';
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

const onPlace = fn();

// A header-only Screen whose title picks a place and whose options hold a line of text.
function PickerHost(): ReactElement {
  const [place] = useState(() => createPlace<ScreenBand>());

  return (
    <ScreenBandPlaceOffer value={place}>
      <Band place={place} />
      <ScreenStackHeader
        title="Build the band"
        titleMenu={
          <Action.Section key="places">
            <Action label="Another place" onPress={onPlace} />
          </Action.Section>
        }
        options={<Text>Band options</Text>}
        optionsBadge={{ kind: 'count', count: 2 }}
      />
    </ScreenBandPlaceOffer>
  );
}

// The band draws the title's menu and the Options button, and the button opens the options the header holds.
export const HeaderOnlyScreenTitleMenuAndOptionsInTheBand: Story = atWidth(
  screenWidths.Wide,
  {
    render: () => <PickerHost />,
    play: async ({ canvas, canvasElement, userEvent }) => {
      const band = await canvas.findByTestId('band');
      const page = within(canvasElement.ownerDocument.body);
      const heading = within(band).getByRole('heading', { level: 2 });

      await userEvent.click(
        within(heading).getByRole('button', { name: 'Build the band' }),
      );
      await userEvent.click(
        await page.findByRole('menuitem', { name: 'Another place' }),
      );
      await expect(onPlace).toHaveBeenCalledTimes(1);

      await userEvent.click(
        within(band).getByRole('button', { name: 'Options, 2' }),
      );
      await expect(await page.findByText('Band options')).toBeVisible();
    },
  },
);
