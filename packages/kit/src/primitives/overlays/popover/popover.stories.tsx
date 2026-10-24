import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Button } from '#primitives/actions/button';
import { contentActionClass, Pressable } from '#primitives/actions/pressable';
import { Text } from '#primitives/content/text';
import { FieldGroup } from '#primitives/fields/field-group';
import { List } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { PopoverAnchor } from './popover-anchor';
import { PopoverTitle } from './popover-title';

function PopoverPreview(): React.JSX.Element {
  return (
    <Popover>
      <PopoverTrigger>
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
    <FieldGroup>
      <FieldGroup.Section>
        {dimensions.map((dimension) => (
          <DimensionField key={dimension.id} {...dimension} />
        ))}
      </FieldGroup.Section>
    </FieldGroup>
  );
}

function DimensionField({
  label,
  defaultValue,
}: (typeof dimensions)[number]): React.JSX.Element {
  const [value, setValue] = useState(defaultValue);

  return (
    <FieldGroup.TextField title={label} value={value} onChangeText={setValue} />
  );
}

const fruits = ['Apple', 'Banana', 'Cherry'].map((name) => ({
  value: name,
  label: name,
}));

// A popover that another control opens, placed against it, holding a choice list at Paper's 320 width.
function AnchoredListPreview(): React.JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor>
        <Button
          label="Choose a fruit"
          variant="secondary"
          onPress={() => setOpen(true)}
        />
      </PopoverAnchor>
      <FruitList onClose={() => setOpen(false)} />
    </Popover>
  );
}

function FruitList(props: { onClose: () => void }): React.JSX.Element {
  return (
    <PopoverContent align="start" accessibilityLabel="Fruit" list>
      <PopoverTitle>Fruit</PopoverTitle>
      <List appearance="plain" fit>
        <List.Section selectionMode="single" onSelectionChange={props.onClose}>
          {fruits.map((fruit) => (
            <ListItem key={fruit.value} id={fruit.value} title={fruit.label} />
          ))}
        </List.Section>
      </List>
    </PopoverContent>
  );
}

const meta = {
  title: 'Design System/Primitives/Overlays/Popover',
  component: Popover,
  argTypes: kitArgTypes('Popover'),
  tags: ['third-party'],
} satisfies Meta<typeof Popover>;

export default meta;

type Story = StoryObj<typeof meta>;

// A popover is its trigger and its content together, so each story composes its own.
export const Default: Story = { render: () => <PopoverPreview /> };

export const AnchoredList: Story = { render: () => <AnchoredListPreview /> };
