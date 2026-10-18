import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Button } from '#primitives/actions/button';
import { Variation, Variations } from '../../../variations';
import { EmptyState } from './empty-state';
import type { EmptyStateProps } from './empty-state-props';

const sessions = {
  icon: 'sessions',
  title: 'No Sessions yet',
  description: 'Start a Session to work with an Agent.',
  action: <Button label="New Session" />,
} satisfies EmptyStateProps;

const issues = {
  icon: 'issue',
  title: 'No open Issues',
  description: 'All caught up.',
} satisfies EmptyStateProps;

const detail = {
  title: 'Select a Session',
  description: 'Choose a Session from the list.',
} satisfies EmptyStateProps;

const plugin = {
  title: 'No Plugins added',
} satisfies EmptyStateProps;

const examples = [
  ['Default', sessions],
  ['No action', detail],
  ['Title only', plugin],
  [
    'Search',
    {
      ...sessions,
      icon: 'search',
      title: 'No matching Sessions',
      description: 'No Session has “deploy” in its title.',
      action: undefined,
    },
  ],
  ['Issue tracker Plugin', issues],
] as const;

const meta = {
  title: 'Design System/Primitives/Status/EmptyState',
  component: EmptyState,
  args: sessions,
} satisfies Meta<typeof EmptyState>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'EmptyState',
  render: () => (
    <Variations>
      {examples.map(([label, props]) => (
        <Variation key={label} label={label}>
          <EmptyState {...props} />
        </Variation>
      ))}
    </Variations>
  ),
};
