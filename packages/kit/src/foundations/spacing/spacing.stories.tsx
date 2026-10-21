import { type SpacingStep, spacingSteps } from '@repo/contracts/kit-tokens';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { cn } from '#kit/utils';
import { Text } from '#primitives/content/text';
import { gapClass, useSpacingStep } from '#primitives/layout/spacing';

const steps = Object.values(spacingSteps);

interface StepProps {
  step: SpacingStep;
}

// Two marks the step holds apart, which is the step as a reader meets it in a gap or a padding.
function Gap({ step }: StepProps): ReactElement {
  return (
    <View className={cn('flex-row', gapClass[step])}>
      <View className="size-6 rounded-xs bg-primary" />
      <View className="size-6 rounded-xs bg-primary" />
    </View>
  );
}

function StepRow({ step }: StepProps): ReactElement {
  const length = useSpacingStep(step);

  return (
    <View className="flex-row items-center gap-4">
      <Text role="row" className="w-16">{`space${step}`}</Text>
      <Text role="secondary" className="w-16">{`${length}pt`}</Text>
      <Gap step={step} />
    </View>
  );
}

function SpacingScale(): ReactElement {
  return (
    <View className="gap-3 p-4">
      {steps.map((step) => (
        <StepRow key={step} step={step} />
      ))}
    </View>
  );
}

/*
 * A foundation is a token scale no component owns, so this file sets no `component:` and has no props
 * table to draw: autodocs is off, and the scale itself is the page.
 */
const meta = {
  title: 'Design System/Foundations/Spacing',
  tags: ['!autodocs'],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Scale: Story = {
  render: SpacingScale,
  parameters: {
    docs: {
      description: {
        story:
          'Every step a gap or padding prop takes, at the length the theme gives it.',
      },
    },
  },
};
