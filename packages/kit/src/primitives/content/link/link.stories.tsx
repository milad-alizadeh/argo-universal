import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Text } from '#primitives/content/text';
import { Variation, Variations } from '../../../variations';
import { Link } from './index';

const meta = {
  title: 'Design System/Primitives/Content/Link',
  component: Link,
  argTypes: kitArgTypes('Link'),
  args: { label: 'Read more', href: 'https://example.com' },
} satisfies Meta<typeof Link>;

export default meta;

type Story = StoryObj<typeof meta>;

const props = meta.args;

const states = (
  <Variations>
    <Variation label="Inline">
      <Text>
        Inline text with <Link {...props} />.
      </Text>
    </Variation>
    <Variation label="Standalone">
      <Text role="secondary" tone="muted">
        <Link {...props} />
      </Text>
    </Variation>
    <Variation label="Route">
      <Text>
        <Link label="Settings" route="/settings" />
      </Text>
    </Variation>
    <Variation label="Unsupported">
      <Text>
        <Link label="Unsupported link" href="file:///example.txt" />
      </Text>
    </Variation>
  </Variations>
);

export const States: Story = { name: 'Link', render: () => states };
