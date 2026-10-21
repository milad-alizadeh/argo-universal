import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Page } from '#primitives/scaffolds/page';
import { Detail } from './detail';
import {
  agentDetail,
  contentAndMetadataDetail,
  emptyDetail,
  loadingDetail,
  narrowContainerDetail,
} from './detail-fixtures';
import { agent, issue } from './detail.mocks';

const meta = {
  title: 'Design System/Primitives/Scaffolds/Detail',
  component: Detail,
  argTypes: kitArgTypes('Detail'),
  /*
   * A Detail fills the Page that holds it, so each story draws it inside one. A story names its own
   * page with `parameters.pageTitle`, and asks for the narrow container with `parameters.narrow`.
   */
  decorators: [
    (Story, { parameters }): React.JSX.Element => (
      <View className={parameters.narrow ? 'h-120 w-90' : 'h-96'}>
        <Page title={parameters.pageTitle ?? issue.title}>
          <Story />
        </Page>
      </View>
    ),
  ],
} satisfies Meta<typeof Detail>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ContentAndMetadata: Story = { args: contentAndMetadataDetail };

export const Agent: Story = {
  args: agentDetail,
  parameters: { pageTitle: agent.title },
};

export const NarrowContainer: Story = {
  args: narrowContainerDetail,
  parameters: { narrow: true },
};

export const Loading: Story = {
  args: loadingDetail,
};

export const Empty: Story = {
  args: emptyDetail,
};
