import { settleLayout } from '@repo/kit/mocks/story-layout';
import { useClaim } from '@repo/kit/place';
import {
  ListDetail,
  ListDetailSidebarPlaceOffer,
} from '@repo/kit/primitives/scaffolds/list-detail';
import { Text } from '@repo/kit/text';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { use, useState } from 'react';
import { Pressable, View } from 'react-native';
import { expect } from 'storybook/test';
import {
  pluginSectionId,
  type Section,
} from '../../../lib/product/navigation/sections';
import {
  FrameListDetailOffers,
  FrameListDetailSidebar,
  useFrameListDetail,
} from './frame-list-detail';
import type { SectionLists } from './section-lists';
import { sectionScaffold } from './section-scaffold';

const lists: SectionLists = {
  sessions: { list: null },
  settings: { list: null },
};

const sidebarPane = 'frame-sidebar';

// The Frame draws the sidebar's pane only while a list holds it; without one the pane is gone and the Frame reads the sidebar as closed.
function SidebarPane({ list }: { list: React.ReactNode }): React.ReactNode {
  return list === null ? null : (
    <View testID={sidebarPane} className="w-frame-list">
      {list}
    </View>
  );
}

// A section's root view: it holds the sidebar from the start, and its ListDetail fills it once its first snapshot arrives.
function SectionRoot({
  name,
  drawn,
}: {
  name: string;
  drawn: boolean;
}): React.ReactNode {
  const sidebar = use(FrameListDetailSidebar);

  useClaim(sidebar, null);

  if (!drawn) return null;

  return (
    <View className="hidden">
      <ListDetailSidebarPlaceOffer value={sidebar}>
        <ListDetail list={<Text>{`${name} list`}</Text>} />
      </ListDetailSidebarPlaceOffer>
    </View>
  );
}

function Button(props: {
  label: string;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.label}
      onPress={props.onPress}
    >
      <Text>{props.label}</Text>
    </Pressable>
  );
}

const first = pluginSectionId('example', 'example');

const second = pluginSectionId('other', 'other');

// The Frame's sidebar beside a Plugin section whose root view opens, and another section it can move to.
function PluginSidebar(): React.JSX.Element {
  const [shown, setShown] = useState<Section>(first);
  const [drawn, setDrawn] = useState(false);
  const listDetail = useFrameListDetail();

  const { list } = sectionScaffold(
    { section: shown, lists, sizeClass: 'wide' },
    listDetail,
  );

  const openOther = (): void => {
    setShown(second);
    setDrawn(false);
  };

  return (
    <View className="flex-1 flex-row">
      <SidebarPane list={list} />
      <View className="flex-1">
        <Button label="First snapshot" onPress={() => setDrawn(true)} />
        <Button label="Open another section" onPress={openOther} />
        <FrameListDetailOffers listDetail={listDetail}>
          <SectionRoot key={shown} name={shown} drawn={drawn} />
        </FrameListDetailOffers>
      </View>
    </View>
  );
}

const meta = {
  title: 'Tests/Frame/ListDetail',
  component: PluginSidebar,
  parameters: { screenPreview: true },
  beforeEach: async (): Promise<void> => {
    await settleLayout('wide');
  },
} satisfies Meta<typeof PluginSidebar>;

export default meta;

type Story = StoryObj<typeof meta>;

// The pane waits, empty, for the first snapshot, and the list that snapshot draws takes it.
export const PaneWaitsForTheFirstSnapshot: Story = {
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByTestId(sidebarPane)).toBeVisible();
    await expect(canvas.queryByText(`${first} list`)).toBeNull();
    await userEvent.click(
      canvas.getByRole('button', { name: 'First snapshot' }),
    );
    await expect(await canvas.findByText(`${first} list`)).toBeVisible();
  },
};

/*
 * Opening another Plugin section keeps the sidebar's pane while that section's root opens. Its list is not the last
 * section's, so the pane waits empty rather than going, which the Frame would otherwise read as a sidebar the person
 * closed and play its close and open motion for.
 */
export const PaneStaysWhileAnotherSectionOpens: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'First snapshot' }),
    );
    await expect(await canvas.findByText(`${first} list`)).toBeVisible();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Open another section' }),
    );
    await expect(canvas.getByTestId(sidebarPane)).toBeVisible();
    await expect(canvas.queryByText(`${first} list`)).toBeNull();
  },
};
