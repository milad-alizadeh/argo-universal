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
export const Title: Story = {
  render: (args) => (
    <Variations>
      {["Couldn't load Sessions", "Couldn't load more Sessions"].map(
        (title) => (
          <Variation key={title} label={title}>
            <LoadError {...args} title={title} />
          </Variation>
        ),
      )}
    </Variations>
  ),
};
export const Description: Story = {
  render: (args) => (
    <Variations>
      {[args.description, 'Try loading the next page again.'].map(
        (description) => (
          <Variation key={description} label={description}>
            <LoadError {...args} description={description} />
          </Variation>
        ),
      )}
    </Variations>
  ),
};
export const OnRetry: Story = {
  render: (args) => (
    <Variations>
      <Variation label="Retry action">
        <LoadError {...args} />
      </Variation>
    </Variations>
  ),
};
