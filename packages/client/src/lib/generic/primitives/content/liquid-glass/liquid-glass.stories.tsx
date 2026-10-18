import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Text } from '#primitives/content/text';
import { Variation, Variations as VariationList } from '../../../variations';
import { LiquidGlass } from './liquid-glass';
import type { LiquidGlassProps } from './liquid-glass-props';

// The web and Android draw each fallback surface; the iOS preview draws Liquid Glass on iOS 26 and later.
const examples: (Omit<LiquidGlassProps, 'children'> & {
  label: string;
  text: string;
})[] = [
  {
    label: 'Card',
    text: 'Message the Agent…',
    corners: 'card',
    className: 'w-full',
    fallbackClassName: 'rounded-2xl bg-card shadow-glass',
  },
  {
    label: 'Capsule',
    text: '2 Subagents',
    corners: 'capsule',
    interactive: true,
    className: 'h-6 justify-center self-start',
    fallbackClassName: 'rounded-full border border-border bg-card shadow-card',
  },
];

const meta = {
  title: 'Design System/Primitives/Content/LiquidGlass',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Variations: Story = {
  name: 'LiquidGlass',
  render: () => (
    <VariationList>
      {examples.map(({ label, text, ...surface }) => (
        <Variation key={label} label={label}>
          <LiquidGlass {...surface}>
            <Text role="body" className="px-4 py-1">
              {text}
            </Text>
          </LiquidGlass>
        </Variation>
      ))}
    </VariationList>
  ),
};
