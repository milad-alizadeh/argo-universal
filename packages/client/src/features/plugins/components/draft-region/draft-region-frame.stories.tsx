import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import {
  headerTag,
  HeaderDrawing,
  listTag,
  ListDrawing,
} from './draft-region-fixtures';
import { DraftRegionFrame } from './draft-region-frame';

// Two regions on a bare page, as a Draft page draws them; the story's own region is the one under test.
const meta = {
  title: 'Plugins/DraftRegionFrame',
  component: DraftRegionFrame,
  decorators: [
    (Story): React.JSX.Element => (
      <View className="w-full gap-6 bg-content p-6 pt-8">
        <Story />
        <DraftRegionFrame
          tag={listTag}
          active={false}
          onActivate={action('activate list')}
          onDeactivate={action('deactivate list')}
          onPrevious={action('previous list')}
          onNext={action('next list')}
        >
          <ListDrawing />
        </DraftRegionFrame>
      </View>
    ),
  ],
  argTypes: {
    tag: { control: false },
    children: { control: false },
    onActivate: { control: false },
    onDeactivate: { control: false },
    onPrevious: { control: false },
    onNext: { control: false },
  },
  args: {
    tag: headerTag,
    active: false,
    onActivate: action('activate'),
    onDeactivate: action('deactivate'),
    onPrevious: action('previous'),
    onNext: action('next'),
    children: <HeaderDrawing />,
  },
} satisfies Meta<typeof DraftRegionFrame>;

export default meta;

type Story = StoryObj<typeof meta>;

// Every region at rest: each tag is quiet and no outline marks a region.
export const Resting: Story = {};

// The pointer is on Header: its tag shows the controls and a hairline outline marks it, while List's tag stays muted.
export const Hovered: Story = { args: { active: true } };
