import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Variation, Variations as VariationList } from '../../../variations';
import { IconButton } from './icon-button';

const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const;

const meta = { title: 'Design System/Primitives/IconButton' } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

function DefaultExample(): React.JSX.Element {
  return (
    <Variation label="Default">
      <View className="flex-row">
        <IconButton icon="more" accessibilityLabel="More actions" />
      </View>
    </Variation>
  );
}

function SidebarButton(props: {
  size: (typeof sizes)[number];
}): React.JSX.Element {
  return (
    <IconButton
      icon="sidebar"
      size={props.size}
      variant="ghost"
      accessibilityLabel={`Sidebar, ${props.size}`}
    />
  );
}

function SizesExample(): React.JSX.Element {
  return (
    <Variation label="Sizes">
      <View className="flex-row items-center gap-2">
        {sizes.map((size) => (
          <SidebarButton key={size} size={size} />
        ))}
      </View>
    </Variation>
  );
}

function FormatButton(props: {
  icon: 'bold' | 'italic';
  label: string;
  pressed: boolean;
}): React.JSX.Element {
  return (
    <IconButton
      icon={props.icon}
      variant="ghost"
      size="xs"
      accessibilityLabel={props.label}
      selected={props.pressed}
    />
  );
}

function PressedExample(): React.JSX.Element {
  return (
    <Variation label="Pressed">
      <View className="flex-row gap-0.5">
        <FormatButton icon="bold" label="Bold" pressed />
        <FormatButton icon="italic" label="Italic" pressed={false} />
      </View>
    </Variation>
  );
}

function DisabledExample(): React.JSX.Element {
  return (
    <Variation label="Disabled">
      <View className="flex-row">
        <IconButton icon="more" accessibilityLabel="More actions" disabled />
      </View>
    </Variation>
  );
}

function LoadingExample(): React.JSX.Element {
  return (
    <Variation label="Loading">
      <View className="flex-row">
        <IconButton icon="more" accessibilityLabel="More actions" loading />
      </View>
    </Variation>
  );
}

const filterDot = (
  <View className="absolute top-1.5 right-1.5 size-1.75 rounded-full border-[1.5px] border-card bg-foreground" />
);

function BadgeExample(): React.JSX.Element {
  return (
    <Variation label="Badge">
      <View className="flex-row">
        <IconButton
          icon="filters"
          variant="ghost"
          accessibilityLabel="Filters"
          badge={filterDot}
        />
      </View>
    </Variation>
  );
}

function IconButtonExamples(): React.JSX.Element {
  return (
    <VariationList>
      <DefaultExample />
      <SizesExample />
      <PressedExample />
      <DisabledExample />
      <LoadingExample />
      <BadgeExample />
    </VariationList>
  );
}

export const Variations: Story = {
  name: 'IconButton',
  render: IconButtonExamples,
};
