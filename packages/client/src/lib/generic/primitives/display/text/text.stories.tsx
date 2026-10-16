const roles = [
  'title',
  'heading',
  'body',
  'secondary',
  'secondary-code',
  'control',
  'badge',
  'code',
  'nav-title',
  'nav-action',
  'row',
  'row-detail',
] as const;

import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Variation, Variations as VariationList } from '../../../variations';
import { Text } from './text';

function RoleExamples(): React.JSX.Element {
  return (
    <VariationList>
      {roles.map((role) => (
        <Variation key={role} label={role}>
          <Text role={role}>The quick brown fox jumps over the lazy dog.</Text>
        </Variation>
      ))}
    </VariationList>
  );
}

const meta = {
  title: 'Design System/Primitives/Text',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Variations: Story = {
  name: 'Text',
  render: RoleExamples,
};
