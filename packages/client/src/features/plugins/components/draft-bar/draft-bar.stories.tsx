import { Button } from '@repo/kit/primitives/actions/button';
import { IconButton } from '@repo/kit/primitives/actions/icon-button';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { DraftBar } from './draft-bar';
import { DraftBarDock } from './draft-bar-dock';
import { populatedDraft } from './draft-bar-fixtures';

// Over a bare page, where the Dock floats it as the App does over a Plugin's page.
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
    choose: <Button label="Choose" size="sm" onPress={action('choose')} />,
  },
} satisfies Meta<typeof DraftBar>;

export default meta;

type Story = StoryObj<typeof meta>;

// A wide window lists the states the Draft draws as tabs.
export const Tabs: Story = { args: { form: 'tabs' } };

// A phone folds the states into one State button, which opens the platform's menu.
export const StateButton: Story = { args: { form: 'menu' } };

const commentToggle = (
  <IconButton
    icon="message"
    accessibilityLabel="Comments"
    control
    variant="secondary"
    onPress={action('toggle comments')}
  />
);

const chooseWithComments = (
  <Button label="Choose · 2 comments" size="sm" onPress={action('choose')} />
);

// The comment toggle sits after the states, and Choose says how many comments it carries.
export const TabsWithComments: Story = {
  args: { form: 'tabs', commentToggle, choose: chooseWithComments },
};

export const StateButtonWithComments: Story = {
  args: { form: 'menu', commentToggle, choose: chooseWithComments },
};
