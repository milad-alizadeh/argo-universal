import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import { LoadError } from './LoadError';

const meta = {
  title: 'Shared/LoadError',
  component: LoadError,
  args: {
    title: "Couldn't load Sessions",
    description:
      "The Server didn't respond. Check that it's running, then retry.",
    onRetry: action('retry'),
  },
} satisfies Meta<typeof LoadError>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Failure: Story = {
  render: (args) => (
    <Variations>
      <Variation label="Initial loading failed">
        <LoadError {...args} />
      </Variation>
      <Variation label="Next page failed">
        <LoadError
          {...args}
          title="Couldn't load more Sessions"
          description="Try loading the next page again."
        />
      </Variation>
    </Variations>
  ),
};
