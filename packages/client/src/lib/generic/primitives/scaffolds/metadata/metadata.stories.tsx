import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Platform, View } from 'react-native';
import { Variation, Variations } from '../../../variations';
import { Metadata } from './metadata';
import { fields } from './metadata.mocks';

const meta = {
  title: 'Design System/Primitives/Scaffolds/Metadata',
  component: Metadata,
  args: { rows: fields },
} satisfies Meta<typeof Metadata>;

export default meta;

const longPath =
  '~/Developer/argo-universal/packages/client/src/lib/generic/primitives/scaffolds/metadata';

const examples = [
  { label: 'Read-only fields', rows: fields },
  {
    label: 'Long path',
    rows: [{ title: 'Path', value: { kind: 'text' as const, text: longPath } }],
  },
];

export const Overview: StoryObj<typeof meta> = {
  name: 'Metadata',
  render: () => (
    <Variations>
      {examples.map(({ label, rows }) => (
        <Variation key={label} label={label}>
          <View style={{ width: Platform.OS === 'web' ? 280 : 360 }}>
            <Metadata rows={rows} />
          </View>
        </Variation>
      ))}
    </Variations>
  ),
};
