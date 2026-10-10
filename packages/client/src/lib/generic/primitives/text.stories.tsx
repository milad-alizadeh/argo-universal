const roles = [
  'title',
  'heading',
  'body',
  'secondary',
  'control',
  'badge',
  'code',
  'nav-title',
  'nav-action',
] as const;

import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Variation, Variations } from '../variations';
import { Text } from './text';

function RoleExamples(): React.JSX.Element {
  return (
    <Variations>
      {roles.map((role) => (
        <Variation key={role} label={role}>
          <Text role={role}>The quick brown fox jumps over the lazy dog.</Text>
        </Variation>
      ))}
    </Variations>
  );
}

const meta = {
  title: 'Design System/Primitives/Text',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'Text',
  render: RoleExamples,
};
