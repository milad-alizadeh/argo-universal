import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { embeddedResource, resourceReferences } from '../../mocks/feed-paper';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import { ResourceReference } from './feed-reference';

const [reference] = resourceReferences;
if (!reference) throw new Error('Resource gallery needs a reference');
const meta = {
  title: 'Feed/ResourceReference',
  component: ResourceReference,
  args: reference,
} satisfies Meta<typeof ResourceReference>;
export default meta;
type Story = StoryObj<typeof meta>;
export const References: Story = {
  name: 'ResourceReference',
  render: () => (
    <Variations>
      {resourceReferences.map((reference) => (
        <Variation key={reference.uri} label={reference.name}>
          <ResourceReference {...reference} />
        </Variation>
      ))}
      <Variation label="Embedded text">
        <ResourceReference {...embeddedResource} />
      </Variation>
    </Variations>
  ),
};
