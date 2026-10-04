import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { CaretUpDownIcon } from 'phosphor-react-native/src/icons/CaretUpDown';
import { useState } from 'react';
import { View } from 'react-native';
import {
  StorySections,
  Variation,
  Variations,
} from '../../mocks/primitive-story-variations';
import { Button } from './button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './collapsible';
import { Icon } from './icon';
import { Text } from './text';

function CollapsibleExample({
  initialOpen = false,
  disabled = false,
}: {
  initialOpen?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      disabled={disabled}
      className="w-full gap-2"
    >
      <View className="flex-row items-center justify-between gap-4">
        <Text className="text-sm font-semibold">
          @peduarte starred 3 repositories
        </Text>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            accessibilityLabel="Toggle repositories"
          >
            <Icon as={CaretUpDownIcon} />
          </Button>
        </CollapsibleTrigger>
      </View>
      <View className="rounded-md border border-border px-4 py-2">
        <Text className="text-sm">@radix-ui/primitives</Text>
      </View>
      <CollapsibleContent className="gap-2">
        <View className="rounded-md border border-border px-4 py-2">
          <Text className="text-sm">@radix-ui/react</Text>
        </View>
        <View className="rounded-md border border-border px-4 py-2">
          <Text className="text-sm">@stitches/core</Text>
        </View>
      </CollapsibleContent>
    </Collapsible>
  );
}
function OpenExamples() {
  return (
    <Variations>
      {[false, true].map((open) => (
        <Variation key={String(open)} label={String(open)}>
          <CollapsibleExample initialOpen={open} />
        </Variation>
      ))}
    </Variations>
  );
}
function DisabledExamples() {
  return (
    <Variations>
      {[false, true].map((disabled) => (
        <Variation key={String(disabled)} label={String(disabled)}>
          <CollapsibleExample disabled={disabled} />
        </Variation>
      ))}
    </Variations>
  );
}

const meta = {
  title: 'Design System/Primitives/Collapsible',
  tags: ['third-party'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <StorySections
      sections={{ Open: OpenExamples, Disabled: DisabledExamples }}
    />
  ),
};
export const Open: Story = { render: OpenExamples };
export const Disabled: Story = { render: DisabledExamples };
