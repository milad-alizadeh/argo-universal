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
  isCoreSection,
  pluginSectionId,
  type Section,
} from '../../../lib/product/navigation/sections';
import {
  FrameListDetailOffers,
  FrameListDetailSidebar,
  FrameSectionWithoutList,
  useFrameListDetail,
} from './frame-list-detail';
import type { SectionLists } from './section-lists';
import { sectionScaffold } from './section-scaffold';

const lists: SectionLists = {
  sessions: { list: <Text>Sessions list</Text> },
  settings: { list: null },
};

const sidebarPane = 'frame-sidebar';

interface SidebarPaneProps {
  list: React.ReactNode;
  onGone: () => void;
}

// The Frame draws the sidebar's pane only while a list holds it; without one the pane is gone and the Frame reads the sidebar as closed.
function SidebarPane({ list, onGone }: SidebarPaneProps): React.ReactNode {
  if (list === null) onGone();

  return list === null ? null : (
    <View testID={sidebarPane} className="w-frame-list">
      {list}
    </View>
  );
}

const saysNoList = (name: string, drawn: boolean): boolean =>
  drawn && name === listless;

// A section's root view: its first snapshot either fills the sidebar through its ListDetail, or says it has no list.
function SectionRoot({
  name,
  drawn,
}: {
  name: string;
  drawn: boolean;
}): React.ReactNode {
  const sidebar = use(FrameListDetailSidebar);
  const withoutList = use(FrameSectionWithoutList);

  useClaim(saysNoList(name, drawn) ? withoutList : undefined, true);

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

const listless = pluginSectionId('plain', 'plain');

const firstSnapshot = 'First snapshot';

// Every render that drew the Frame without the pane, which starts its close motion even when the next commit reopens it.
const goneCommits: Section[] = [];

interface PluginSidebarProps {
  start?: Section;
}

// The Frame's sidebar beside a Plugin section whose root view opens, and another section it can move to.
function PluginSidebar({
  start = first,
}: PluginSidebarProps): React.JSX.Element {
  const [shown, setShown] = useState<Section>(start);
  const [drawn, setDrawn] = useState(false);
  const listDetail = useFrameListDetail();

  const { list } = sectionScaffold(
    { section: shown, lists, sizeClass: 'wide' },
    listDetail,
  );

  const openOther = (): void => {
    setShown(shown === first ? second : first);
    setDrawn(false);
  };

  return (
    <View className="flex-1 flex-row">
      <SidebarPane list={list} onGone={() => goneCommits.push(shown)} />
      <View className="flex-1">
        <Button label={firstSnapshot} onPress={() => setDrawn(true)} />
        <Button label="Open another section" onPress={openOther} />
        <FrameListDetailOffers listDetail={listDetail}>
          {isCoreSection(shown) ? null : (
            <SectionRoot key={shown} name={shown} drawn={drawn} />
          )}
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
    await userEvent.click(canvas.getByRole('button', { name: firstSnapshot }));
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
    await userEvent.click(canvas.getByRole('button', { name: firstSnapshot }));
    await expect(await canvas.findByText(`${first} list`)).toBeVisible();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Open another section' }),
    );
    await expect(canvas.getByTestId(sidebarPane)).toBeVisible();
    await expect(canvas.queryByText(`${first} list`)).toBeNull();
  },
};

// Coming from a core section, no render draws the Plugin section without its pane, though its root view has only just mounted.
export const NoRenderWithoutThePaneFromACoreSection: Story = {
  args: { start: 'sessions' },
  play: async ({ canvas, userEvent }) => {
    goneCommits.length = 0;
    await userEvent.click(
      canvas.getByRole('button', { name: 'Open another section' }),
    );
    await userEvent.click(canvas.getByRole('button', { name: firstSnapshot }));
    await expect(await canvas.findByText(`${first} list`)).toBeVisible();
    await expect(goneCommits).toStrictEqual([]);
  },
};

// The pane goes only when the first snapshot of a section's root says there is no list.
export const PaneGoesWhenTheRootHasNoList: Story = {
  args: { start: listless },
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByTestId(sidebarPane)).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: firstSnapshot }));
    await expect(canvas.queryByTestId(sidebarPane)).toBeNull();
  },
};
