import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Screen } from '#primitives/scaffolds/screen';
import { Detail } from './detail';
import {
  agentDetail,
  contentAndMetadataDetail,
  emptyDetail,
  errorDetail,
  loadingDetail,
} from './detail-fixtures';
import { agent, issue } from './detail.mocks';

const meta = {
  title: 'Design System/Primitives/Scaffolds/Detail',
  component: Detail,
  argTypes: kitArgTypes('Detail'),
  /*
   * A Detail fills the Screen that holds it, so each story draws it inside one, with the Issue's Metadata in the
   * Screen's aside. A story names its own page with `parameters.screenTitle` and `parameters.aside`.
   */
  decorators: [
    (Story, { parameters }): React.JSX.Element => (
      <View className="h-96">
        <Screen
          title={parameters.screenTitle ?? issue.title}
          aside={parameters.aside ?? issue.aside}
        >
          <Story />
        </Screen>
      </View>
    ),
  ],
} satisfies Meta<typeof Detail>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ContentAndMetadata: Story = { args: contentAndMetadataDetail };

export const Agent: Story = {
  args: agentDetail,
  parameters: { screenTitle: agent.title, aside: agent.aside },
};

export const Loading: Story = {
  args: loadingDetail,
};

export const Empty: Story = {
  args: emptyDetail,
};

export const Failed: Story = {
  args: errorDetail,
};
