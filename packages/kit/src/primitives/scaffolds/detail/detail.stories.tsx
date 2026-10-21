import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Page } from '#primitives/scaffolds/page';
import { EmptyState } from '#primitives/status/empty-state';
import { Detail } from './detail';
import { agent, issue } from './detail.mocks';

const meta = {
  title: 'Design System/Primitives/Scaffolds/Detail',
  component: Detail,
  argTypes: kitArgTypes('Detail'),
  args: { metadata: issue.detail.metadata },
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

export const ContentAndMetadata: Story = { args: issue.detail };

export const Agent: Story = {
  args: agent.detail,
  parameters: { pageTitle: agent.title },
};

export const NarrowContainer: Story = {
  args: issue.detail,
  parameters: { narrow: true },
};

export const Loading: Story = {
  args: { ...issue.detail, isLoading: true },
};

export const Empty: Story = {
  args: { children: <EmptyState title="No description" icon="issue" /> },
};
