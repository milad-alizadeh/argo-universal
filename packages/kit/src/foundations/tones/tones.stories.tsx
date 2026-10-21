import { tones } from '@repo/contracts/kit-tokens';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { useCSSVariable } from 'uniwind';
import { Text } from '#primitives/content/text';
import {
  resolvedToneShades,
  toneShadeSteps,
  toneShadeTokens,
} from '#primitives/native/tone-shades';

type Tone = (typeof tones)[number];

interface SwatchProps {
  step: number;
  color: string;
}

function Swatch({ step, color }: SwatchProps): ReactElement {
  return (
    <View className="items-center gap-1">
      <View
        className="size-10 rounded-control border border-border"
        style={{ backgroundColor: color }}
      />
      <Text role="secondary">{String(step)}</Text>
    </View>
  );
}

interface ToneRowProps {
  tone: Tone;
  shades: string[];
}

function ToneRow({ tone, shades }: ToneRowProps): ReactElement {
  return (
    <View className="flex-row items-center gap-3">
      <Text role="row" className="w-24">
        {tone}
      </Text>
      {toneShadeSteps.map((step, index) => (
        <Swatch key={step} step={step} color={shades[index] ?? ''} />
      ))}
    </View>
  );
}

// The ramp a tone prop reads: nine steps of `--color-tone-<tone>-<step>`, as the theme resolves them.
function ToneRamp(): ReactElement {
  const shades = resolvedToneShades(useCSSVariable(toneShadeTokens));

  return (
    <View className="gap-4 p-4">
      {tones.map((tone) => (
        <ToneRow key={tone} tone={tone} shades={shades[tone] ?? []} />
      ))}
    </View>
  );
}

/*
 * A foundation is a token scale no component owns, so this file sets no `component:` and has no props
 * table to draw: autodocs is off, and the scale itself is the page.
 */
const meta = {
  title: 'Design System/Foundations/Tones',
  tags: ['!autodocs'],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Ramp: Story = {
  render: ToneRamp,
  parameters: {
    docs: {
      description: {
        story:
          'Every tone a tone prop takes, over the nine shades the theme aliases to Tailwind.',
      },
    },
  },
};
