import { IconButton } from '@repo/kit/primitives/actions/icon-button';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { DraftBar } from './draft-bar';
import { DraftBarDock } from './draft-bar-dock';
import { populatedDraft } from './draft-bar-fixtures';
import { DraftChooseButton } from './draft-choose-button';

const meta = {
  title: 'Plugins/DraftBar',
  component: DraftBar,
  decorators: [
    (Story): React.JSX.Element => (
      <View className="h-96 w-full bg-content">
        <DraftBarDock>
          <Story />
        </DraftBarDock>
      </View>
    ),
  ],
  argTypes: {
    states: { control: false },
    current: { control: false },
    form: { control: 'inline-radio', options: ['tabs', 'menu'] },
    onStateChange: { control: false },
    commentToggle: { control: false },
    choose: { control: false },
  },
  args: {
    ...populatedDraft,
    onStateChange: action('state change'),
    choose: <DraftChooseButton comments={0} onPress={action('choose')} />,
  },
} satisfies Meta<typeof DraftBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Tabs: Story = { args: { form: 'tabs' } };

export const StateButton: Story = { args: { form: 'menu' } };

const commentToggle = (
  <IconButton
    icon="message"
    accessibilityLabel="Comments"
    size="md"
    variant="secondary"
    onPress={action('toggle comments')}
  />
);

const chooseWithComments = (
  <DraftChooseButton comments={2} onPress={action('choose')} />
);

export const TabsWithComments: Story = {
  args: { form: 'tabs', commentToggle, choose: chooseWithComments },
};

export const StateButtonWithComments: Story = {
  args: { form: 'menu', commentToggle, choose: chooseWithComments },
};
