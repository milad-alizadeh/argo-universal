import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { embeddedResource, resourceReferences } from '../../mocks/feed-paper';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import { FeedCodeBlock } from './feed-code-block';

const [reference] = resourceReferences;
if (!reference) throw new Error('Resource gallery needs a reference');
const meta = {
  title: 'Feed/CodeBlock',
  component: FeedCodeBlock,
  args: { resource: reference },
} satisfies Meta<typeof FeedCodeBlock>;
export default meta;
type Story = StoryObj<typeof meta>;
export const References: Story = {
  name: 'Resources',
  render: () => (
    <Variations>
      {resourceReferences.map((reference) => (
        <Variation key={reference.uri} label={reference.name}>
          <FeedCodeBlock resource={reference} />
        </Variation>
      ))}
      <Variation label="Embedded text">
        <FeedCodeBlock
          resource={embeddedResource}
          code={embeddedResource.text}
        />
      </Variation>
    </Variations>
  ),
};
