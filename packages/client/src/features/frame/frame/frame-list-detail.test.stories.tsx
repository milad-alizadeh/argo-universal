import { settleLayout } from '@repo/kit/mocks/story-layout';
import { ListDetail } from '@repo/kit/primitives/scaffolds/list-detail';
import { Text } from '@repo/kit/text';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { expect } from 'storybook/test';
import {
  pluginSectionId,
  type Section,
} from '../../../lib/product/navigation/sections';
import {
  FrameListDetailOffers,
  SectionListDetail,
  useFrameListDetail,
  useKeepSidebarWhileOpening,
  useKeepSidebarWhilePending,
} from './frame-list-detail';
import type { SectionLists } from './section-lists';
import { sectionScaffold } from './section-scaffold';

const section = pluginSectionId('example', 'example');

const lists: SectionLists = {
  sessions: { list: null },
  settings: { list: null },
};

type Step = 'open' | 'pending' | 'closed' | 'gone';

// A page whose drawing has not arrived: it draws nothing, as a Plugin page does until its first snapshot.
function PendingPage(): null {
  useKeepSidebarWhilePending();

  return null;
}

function DrawnPage({ name }: { name: string }): React.JSX.Element {
  return (
    <ListDetail
      list={<Text>{`${name} list`}</Text>}
      detail={<Text>{`${name} detail`}</Text>}
    />
  );
}

// Every Plugin page says it is here for the whole of its life, as the Plugin screen does; `gone` is the gap before one mounts.
function PluginPage({ page }: { page: React.ReactNode }): React.ReactNode {
  useKeepSidebarWhileOpening();

  return page;
}

const pages: Record<Exclude<Step, 'gone'>, React.ReactNode> = {
  open: <DrawnPage name="Open" />,
  pending: <PendingPage />,
  closed: <DrawnPage name="Closed" />,
};

const shownPage = (step: Step): React.ReactNode =>
  step === 'gone' ? null : <PluginPage page={pages[step]} />;

function Step({
  step,
  onStep,
}: {
  step: Step;
  onStep: (step: Step) => void;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Show ${step}`}
      onPress={() => onStep(step)}
    >
      <Text>{`Show ${step}`}</Text>
    </Pressable>
  );
}

const otherSection = pluginSectionId('other', 'other');

const sidebarPane = 'frame-sidebar';

// The Frame draws the sidebar's pane only while a list holds it; without one the pane is gone and the Frame reads the sidebar as closed.
function SidebarPane({ list }: { list: React.ReactNode }): React.ReactNode {
  return list === null ? null : (
    <View testID={sidebarPane} className="w-frame-list">
      {list}
    </View>
  );
}

// The Frame's sidebar beside a Plugin section whose pages replace one another, as a wide window's replace.
function PluginSidebarPages(): React.JSX.Element {
  const [step, setStep] = useState<Step>('open');
  const [shown, setShown] = useState<Section>(section);
  const listDetail = useFrameListDetail(shown);

  const { list } = sectionScaffold(
    { section: shown, lists, sizeClass: 'wide' },
    listDetail,
  );

  const openOther = (): void => {
    setShown(otherSection);
    setStep('gone');
  };

  return (
    <View className="flex-1 flex-row">
      <SidebarPane list={list} />
      <View className="flex-1">
        <Step step="pending" onStep={setStep} />
        <Step step="closed" onStep={setStep} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open another section"
          onPress={openOther}
        >
          <Text>Open another section</Text>
        </Pressable>
        <FrameListDetailOffers listDetail={listDetail}>
          <SectionListDetail key={`${shown}-${step}`}>
            {shownPage(step)}
          </SectionListDetail>
        </FrameListDetailOffers>
      </View>
    </View>
  );
}

const meta = {
  title: 'Tests/Frame/ListDetail',
  component: PluginSidebarPages,
  parameters: { screenPreview: true },
  beforeEach: async (): Promise<void> => {
    await settleLayout('wide');
  },
} satisfies Meta<typeof PluginSidebarPages>;

export default meta;

type Story = StoryObj<typeof meta>;

// The sidebar keeps the list of the page before while the next page has drawn nothing, then shows the list that page draws.
export const SidebarKeepsListWhilePending: Story = {
  play: async ({ canvas, userEvent }) => {
    await expect(await canvas.findByText('Open list')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Show pending' }));
    await expect(canvas.getByText('Open list')).toBeVisible();
    await expect(canvas.queryByText('Open detail')).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: 'Show closed' }));
    await expect(await canvas.findByText('Closed list')).toBeVisible();
    await expect(canvas.queryByText('Open list')).toBeNull();
  },
};

/*
 * Opening another Plugin section keeps the sidebar's pane in the gap before that section's page mounts. It has no
 * list of its own to keep, so the pane waits empty rather than going, which the Frame would otherwise read as a
 * sidebar the person closed and play its close and open motion for.
 */
export const SidebarStaysWhileAnotherSectionOpens: Story = {
  play: async ({ canvas, userEvent }) => {
    await expect(await canvas.findByText('Open list')).toBeVisible();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Open another section' }),
    );
    await expect(canvas.getByTestId(sidebarPane)).toBeVisible();
    await expect(canvas.queryByText('Open list')).toBeNull();
  },
};
