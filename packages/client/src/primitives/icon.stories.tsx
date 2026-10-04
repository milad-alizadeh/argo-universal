import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Check, Plus, Search } from 'lucide-react-native';
import {
  StorySections,
  Variation,
  Variations,
} from '../../mocks/primitive-story-variations';
import { Icon } from './icon';

function AsExamples() {
  return (
    <Variations>
      {[
        ['Plus', Plus],
        ['Check', Check],
        ['Search', Search],
      ].map(([label, icon]) => (
        <Variation key={String(label)} label={String(label)}>
          <Icon as={icon as typeof Plus} />
        </Variation>
      ))}
    </Variations>
  );
}
function SizeExamples() {
  return (
    <Variations>
      {['size-4', 'size-6', 'size-8'].map((className) => (
        <Variation key={className} label={className}>
          <Icon as={Plus} className={className} />
        </Variation>
      ))}
    </Variations>
  );
}
const meta = {
  title: 'Design System/Primitives/Icon',
  tags: ['third-party'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <StorySections sections={{ As: AsExamples, ClassName: SizeExamples }} />
  ),
};
export const As: Story = { render: AsExamples };
export const ClassName: Story = { render: SizeExamples };
