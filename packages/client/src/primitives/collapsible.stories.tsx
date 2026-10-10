import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import { Icon } from '../lib/icon';
import { Button } from './button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './collapsible';
import { Text } from './text';

type CollapsibleExampleProps = {
  initialOpen?: boolean;
  disabled?: boolean;
};

function CollapsibleExample({
  initialOpen = false,
  disabled = false,
}: CollapsibleExampleProps): React.JSX.Element {
  const [open, setOpen] = useState(initialOpen);
  const props = { open, onOpenChange: setOpen, disabled };
  return (
    <Collapsible {...props} className="w-full gap-2">
      <RepositoriesHeader />
      <RepositoriesContent />
    </Collapsible>
  );
}

const meta = {
  title: 'Design System/Primitives/Collapsible',
  tags: ['third-party'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'Collapsible',
  render: () => (
    <Variations>
      <Variation label="Closed">
        <CollapsibleExample />
      </Variation>
      <Variation label="Open">
        <CollapsibleExample initialOpen />
      </Variation>
      <Variation label="Disabled">
        <CollapsibleExample disabled />
      </Variation>
    </Variations>
  ),
};

function RepositoriesHeader(): React.JSX.Element {
  return (
    <View className="flex-row items-center justify-between gap-4">
      <Text className="text-sm font-semibold">
        @peduarte starred 3 repositories
      </Text>
      <RepositoriesTrigger />
    </View>
  );
}
function RepositoryRow({ name }: { name: string }): React.JSX.Element {
  return (
    <View className="rounded-md border border-border px-4 py-2">
      <Text className="text-sm">{name}</Text>
    </View>
  );
}

function RepositoriesContent(): React.JSX.Element {
  return (
    <>
      {' '}
      <RepositoryRow name="@radix-ui/primitives" />
      <CollapsibleContent className="gap-2">
        <RepositoryRow name="@radix-ui/react" />
        <RepositoryRow name="@stitches/core" />
      </CollapsibleContent>
    </>
  );
}

function RepositoriesTrigger(): React.JSX.Element {
  return (
    <CollapsibleTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        accessibilityLabel="Toggle repositories"
      >
        <Icon name="chevron-up-down" />
      </Button>
    </CollapsibleTrigger>
  );
}
