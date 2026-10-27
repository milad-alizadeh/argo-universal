import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { expect, waitFor } from 'storybook/test';
import { settleLayout } from '#mocks/story-layout';
import { Button } from '#primitives/actions/button';
import { Text } from '#primitives/content/text';
import { useStackPush, withStack } from '#story-stack';
import {
  createPlace,
  createPlaceOffer,
  useClaim,
  useClaimed,
  useOfferedPlace,
} from './place';

const Offer = createPlaceOffer<string>();

// One Place for the story: the pages below claim it, and a probe reads it as a Frame's band would.
const place = createPlace<string>();

function Page({
  name,
  children,
}: {
  name: string;
  children?: ReactElement;
}): ReactElement {
  useClaim(useOfferedPlace(Offer), name);

  return (
    <View>
      <Text>{`${name} page`}</Text>
      {children}
    </View>
  );
}

function Probe(): ReactElement {
  return <Text testID="held">{useClaimed(place) ?? 'nothing'}</Text>;
}

function Root(): ReactElement {
  const push = useStackPush();

  return (
    <Offer value={place}>
      <Probe />
      <Page name="Root">
        <Button label="Open Detail" onPress={() => push('detail')} />
      </Page>
    </Offer>
  );
}

function Detail(): ReactElement {
  const router = useRouter();

  return (
    <Offer value={place}>
      <Page name="Detail">
        <Button label="Go back" onPress={() => router.back()} />
      </Page>
    </Offer>
  );
}

const meta = {
  title: 'Tests/Place',
  component: Root,
  decorators: [withStack({ detail: Detail })],
} satisfies Meta<typeof Root>;

export default meta;

type Story = StoryObj<typeof meta>;

const heldIs = async (
  canvas: Parameters<NonNullable<Story['play']>>[0]['canvas'],
  text: string,
): Promise<void> => {
  await waitFor(() =>
    expect(canvas.getByTestId('held')).toHaveTextContent(text),
  );
};

// A page pushed over another takes the Place, and the page under it takes it again when the pushed one goes.
export const OnlyTheShownPageHoldsThePlace: Story = {
  beforeEach: () => settleLayout('wide'),
  play: async ({ canvas, userEvent }) => {
    await heldIs(canvas, 'Root');

    await userEvent.click(
      await canvas.findByRole('button', { name: 'Open Detail' }),
    );
    await heldIs(canvas, 'Detail');

    await userEvent.click(
      await canvas.findByRole('button', { name: 'Go back' }),
    );
    await heldIs(canvas, 'Root');
  },
};

// Below wide nothing is offered, so no page holds the Place.
export const NothingHoldsThePlaceBelowWide: Story = {
  beforeEach: () => settleLayout('tablet'),
  play: async ({ canvas }) => {
    await canvas.findByText('Root page');
    await expect(canvas.getByTestId('held')).toHaveTextContent('nothing');
  },
};
