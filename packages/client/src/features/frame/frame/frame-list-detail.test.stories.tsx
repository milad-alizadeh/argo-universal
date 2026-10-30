import { settleLayout } from '@repo/kit/mocks/story-layout';
import { ListDetail } from '@repo/kit/primitives/scaffolds/list-detail';
import { Text } from '@repo/kit/text';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { expect } from 'storybook/test';
import { pluginSectionId } from '../../../lib/product/navigation/sections';
import {
  FrameListDetailPendingOffer,
  FrameListDetailSidebar,
  sectionScaffold,
  SectionListDetail,
  useFrameListDetail,
  useKeepSidebarWhilePending,
} from './frame-list-detail';
import type { SectionLists } from './section-lists';

const section = pluginSectionId('example', 'example');

const lists: SectionLists = {
  sessions: { list: null },
  settings: { list: null },
};

type Step = 'open' | 'pending' | 'closed';

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

const pages: Record<Step, React.JSX.Element> = {
  open: <DrawnPage name="Open" />,
  pending: <PendingPage />,
  closed: <DrawnPage name="Closed" />,
};

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

// The Frame's sidebar beside a Plugin section whose pages replace one another, as a wide window's replace.
function PluginSidebarPages(): React.JSX.Element {
  const [step, setStep] = useState<Step>('open');
  const listDetail = useFrameListDetail(section);
  const { list } = sectionScaffold({ section, lists }, listDetail);

  return (
    <View className="flex-1 flex-row">
      <View className="w-frame-list">{list}</View>
      <View className="flex-1">
        <Step step="pending" onStep={setStep} />
        <Step step="closed" onStep={setStep} />
        <FrameListDetailSidebar value={listDetail.sidebar}>
          <FrameListDetailPendingOffer value={listDetail.pending}>
            <SectionListDetail key={step}>{pages[step]}</SectionListDetail>
          </FrameListDetailPendingOffer>
        </FrameListDetailSidebar>
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
