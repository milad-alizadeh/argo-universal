import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { Variation, Variations as VariationList } from '../../../variations';
import { Avatar } from './avatar';

const tones = [
  'neutral',
  'muted',
  'accent',
  'info',
  'success',
  'warning',
  'danger',
  'done',
] as const;

const meta = {
  title: 'Design System/Primitives/Content/Avatar',
  component: Avatar,
  args: { initials: 'SR', accessibilityLabel: 'Sam Rivera' },
  tags: ['third-party'],
} satisfies Meta<typeof Avatar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Variations: Story = {
  name: 'Avatar',
  render: (args) => <AvatarVariations args={args} />,
};

function AvatarVariations({
  args,
}: {
  args: React.ComponentProps<typeof Avatar>;
}): React.JSX.Element {
  return (
    <VariationList>
      <AvatarInitialsExamples args={args} />
      <AvatarToneVariations />
    </VariationList>
  );
}

function AvatarInitialsExamples({
  args,
}: {
  args: React.ComponentProps<typeof Avatar>;
}): React.JSX.Element {
  return (
    <>
      <InitialsExample args={args} />
      <StatusExample args={args} />
    </>
  );
}

function InitialsExample({
  args,
}: {
  args: React.ComponentProps<typeof Avatar>;
}): React.JSX.Element {
  return (
    <Variation label="Initials">
      <Avatar {...args} />
    </Variation>
  );
}

function StatusExample({
  args,
}: {
  args: React.ComponentProps<typeof Avatar>;
}): React.JSX.Element {
  return (
    <Variation label="With status">
      <Avatar {...args} status={{ tone: 'success' }} />
    </Variation>
  );
}

function AvatarToneVariations(): React.JSX.Element {
  return (
    <Variation label="Status tones">
      <View className="flex-row gap-3">
        {tones.map((tone) => (
          <AvatarTone key={tone} tone={tone} />
        ))}
      </View>
    </Variation>
  );
}

function AvatarTone({
  tone,
}: {
  tone: (typeof tones)[number];
}): React.JSX.Element {
  return (
    <Avatar initials="SR" accessibilityLabel="Sam Rivera" status={{ tone }} />
  );
}
