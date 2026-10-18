import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Page } from '#primitives/scaffolds/page';
import { EmptyState } from '#primitives/status/empty-state';
import { Variation, Variations } from '../../../variations';
import { Detail } from './detail';
import type { DetailProps } from './detail-props';
import { agent, issue } from './detail.mocks';

const meta = {
  title: 'Design System/Primitives/Scaffolds/Detail',
  component: Detail,
  args: issue.detail,
} satisfies Meta<typeof Detail>;

export default meta;

const examples: {
  label: string;
  title: string;
  narrow?: boolean;
  detail: DetailProps;
}[] = [
  { label: 'Content and Metadata', ...issue },
  { label: 'Agent', ...agent },
  { label: 'Narrow container', narrow: true, ...issue },
  {
    label: 'Loading',
    title: issue.title,
    detail: { ...issue.detail, isLoading: true },
  },
  {
    label: 'Empty',
    title: issue.title,
    detail: {
      metadata: issue.detail.metadata,
      children: <EmptyState title="No description" icon="issue" />,
    },
  },
];

export const Overview: StoryObj<typeof meta> = {
  name: 'Detail',
  render: () => (
    <Variations className="max-w-3xl">
      {examples.map(({ label, title, narrow, detail }) => (
        <Variation key={label} label={label}>
          <View className={narrow ? 'h-120 w-90' : 'h-96'}>
            <Page title={title}>
              <Detail {...detail} />
            </Page>
          </View>
        </Variation>
      ))}
    </Variations>
  ),
};
