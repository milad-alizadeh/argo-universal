import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Text } from '#lib/generic/primitives/display/text/text';
import { Input } from '#lib/generic/primitives/inputs/input/input';
import { Pressable, contentActionClass } from '../../pressable/pressable';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

function PopoverPreview(): React.JSX.Element {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Pressable
          role="button"
          className={contentActionClass({ variant: 'outline' })}
        >
          <Text>{'Open popover'}</Text>
        </Pressable>
      </PopoverTrigger>
      <DimensionContent />
    </Popover>
  );
}

function DimensionContent(): React.JSX.Element {
  return (
    <PopoverContent className="w-80" side="top">
      <View className="gap-4">
        <DimensionHeading />
        <DimensionFields />
      </View>
    </PopoverContent>
  );
}

function DimensionHeading(): React.JSX.Element {
  return (
    <View className="gap-2">
      <Text role={'heading'}>Dimensions</Text>
      <Text role="secondary">Set the dimensions for the layer.</Text>
    </View>
  );
}

const dimensions = [
  { id: 'width', label: 'Width', defaultValue: '100%' },
  { id: 'maxWidth', label: 'Max. width', defaultValue: '300px' },
  { id: 'height', label: 'Height', defaultValue: '25px' },
  { id: 'maxHeight', label: 'Max. height', defaultValue: 'none' },
];

function DimensionFields(): React.JSX.Element {
  return (
    <View className="gap-2">
      {dimensions.map((dimension) => (
        <DimensionField key={dimension.id} {...dimension} />
      ))}
    </View>
  );
}

function DimensionField({
  id,
  label,
  defaultValue,
}: (typeof dimensions)[number]): React.JSX.Element {
  const inputProps = { id, accessibilityLabel: label, defaultValue };

  return (
    <View className="flex-row items-center gap-4">
      <Text className="web:block w-24">{label}</Text>
      <Input {...inputProps} className="flex-1 sm:h-8" />
    </View>
  );
}

const meta = {
  title: 'Design System/Primitives/Popover',
  tags: ['third-party'],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Variations: Story = {
  name: 'Popover',
  render: () => <PopoverPreview />,
};
