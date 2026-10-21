import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Platform, View } from 'react-native';
import { kitArgTypes } from '#kit/kit-arg-types';
import { List } from '#primitives/lists/list';
import { Variation, Variations } from '../../../variations';
import { Metadata } from './metadata';
import { fields } from './metadata.mocks';

const meta = {
  title: 'Design System/Primitives/Scaffolds/Metadata',
  component: Metadata,
  argTypes: kitArgTypes('Metadata'),
} satisfies Meta<typeof Metadata>;

export default meta;

const longPath =
  '~/Developer/argo-universal/packages/kit/src/primitives/scaffolds/metadata';

const examples = [
  { label: 'Read-only fields', props: fields },
  {
    label: 'Long path',
    props: { children: <Metadata.Label title="Path" text={longPath} /> },
  },
];

export const Overview: StoryObj<typeof meta> = {
  name: 'Metadata',
  render: () => (
    <Variations>
      {examples.map(({ label, props }) => (
        <Variation key={label} label={label}>
          <View style={{ width: Platform.OS === 'web' ? 280 : 360 }}>
            <Metadata {...props} />
          </View>
        </Variation>
      ))}
    </Variations>
  ),
};

// Inside a grouped List, such as a Settings page, the fields are rows of the section's card.
export const InAGroupedList: StoryObj<typeof meta> = {
  render: () => (
    <View style={{ width: 360 }}>
      <List appearance="grouped" maxHeight={400}>
        <Metadata title="Section">
          <Metadata.Label title="Path" text="~/Folder/item" />
        </Metadata>
      </List>
    </View>
  ),
};
