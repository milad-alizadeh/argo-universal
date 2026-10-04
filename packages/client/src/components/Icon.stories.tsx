import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { IconWeight } from 'phosphor-react-native';
import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { HeartIcon } from 'phosphor-react-native/src/icons/Heart';
import { MagnifyingGlassIcon } from 'phosphor-react-native/src/icons/MagnifyingGlass';
import { PlusIcon } from 'phosphor-react-native/src/icons/Plus';
import { Button } from '#primitives/button';
import {
  StorySections,
  Variation,
  Variations,
} from '../../mocks/primitive-story-variations';
import { Icon } from './Icon';

function AsExamples() {
  return (
    <Variations>
      {[
        { label: 'Plus', icon: PlusIcon },
        { label: 'Check', icon: CheckIcon },
        { label: 'Search', icon: MagnifyingGlassIcon },
      ].map(({ label, icon }) => (
        <Variation key={label} label={label}>
          <Button size="icon" aria-label={label}>
            <Icon as={icon} />
          </Button>
        </Variation>
      ))}
    </Variations>
  );
}

function SizeExamples() {
  return (
    <Variations>
      {[16, 24, 32].map((size) => (
        <Variation key={size} label={String(size)}>
          <Icon as={PlusIcon} size={size} />
        </Variation>
      ))}
    </Variations>
  );
}

const weights: IconWeight[] = [
  'thin',
  'light',
  'regular',
  'bold',
  'fill',
  'duotone',
];

function WeightExamples() {
  return (
    <Variations>
      {weights.map((weight) => (
        <Variation key={weight} label={weight}>
          <Icon as={HeartIcon} weight={weight} />
        </Variation>
      ))}
    </Variations>
  );
}

function ClassNameExamples() {
  return (
    <Variations>
      {[
        'text-foreground',
        'text-muted-foreground',
        'text-primary',
        'text-destructive',
      ].map((className) => (
        <Variation key={className} label={className}>
          <Icon as={HeartIcon} className={className} />
        </Variation>
      ))}
    </Variations>
  );
}

const meta = {
  title: 'Design System/Components/Icon',
  component: Icon,
  args: { as: PlusIcon },
  tags: ['third-party'],
} satisfies Meta<typeof Icon>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <StorySections
      sections={{
        As: AsExamples,
        Size: SizeExamples,
        Weight: WeightExamples,
        ClassName: ClassNameExamples,
      }}
    />
  ),
};
export const As: Story = { render: AsExamples };
export const Size: Story = { render: SizeExamples };
export const Weight: Story = { render: WeightExamples };
export const ClassName: Story = { render: ClassNameExamples };
