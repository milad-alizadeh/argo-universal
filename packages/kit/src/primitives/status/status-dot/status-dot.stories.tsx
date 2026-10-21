import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Variation, Variations as VariationList } from '../../../variations';
import { StatusDot } from './status-dot';

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
  title: 'Design System/Primitives/Status/StatusDot',
  component: StatusDot,
  argTypes: kitArgTypes('StatusDot'),
  args: { tone: 'success' },
  tags: ['third-party'],
} satisfies Meta<typeof StatusDot>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Variations: Story = {
  name: 'StatusDot',
  render: () => <StatusDotVariations />,
};

function StatusDotVariations(): React.JSX.Element {
  return (
    <VariationList>
      <ToneVariations />
      <PulsingExample />
    </VariationList>
  );
}

function ToneVariations(): React.JSX.Element {
  return (
    <>
      {tones.map((tone) => (
        <Variation key={tone} label={`tone ${tone}`}>
          <View className="flex-row items-center">
            <StatusDot tone={tone} />
          </View>
        </Variation>
      ))}
    </>
  );
}

function PulsingExample(): React.JSX.Element {
  return (
    <Variation label="Pulsing">
      <View className="flex-row items-center">
        <StatusDot tone="success" pulse />
      </View>
    </Variation>
  );
}
