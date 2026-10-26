import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ReactElement } from 'react';
import { View } from 'react-native';
import { expect, fn, within } from 'storybook/test';
import { useClaimed } from '#kit/claim-store';
import { Action } from '#primitives/actions/action';
import {
  createScreenBandHost,
  ScreenBandHostContext,
  type ScreenBandHost,
} from './screen-band';
import { ScreenStackHeader } from './screen-stack-header';
import { atWidth, screenWidths } from './screen-widths.mocks';

const meta = {
  title: 'Tests/Design System/Primitives/Scaffolds/Screen/Band',
  component: ScreenStackHeader,
} satisfies Meta<typeof ScreenStackHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

const onRename = fn();

// The host's band, drawing what the claiming header declared.
function Band({ host }: { host: ScreenBandHost }): ReactElement {
  const band = useClaimed(host);

  return (
    <View testID="band" className="flex-row items-center">
      {band?.title}
      {band?.menu}
    </View>
  );
}

function Host(): ReactElement {
  const [host] = useState(createScreenBandHost);

  return (
    <ScreenBandHostContext value={host}>
      <Band host={host} />
      <ScreenStackHeader
        title="Build the band"
        actions={
          <Action label="More" icon="more">
            <Action label="Rename" icon="rename" onPress={onRename} />
          </Action>
        }
      />
    </ScreenBandHostContext>
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
