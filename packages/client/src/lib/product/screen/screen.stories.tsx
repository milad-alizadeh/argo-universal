import { Variation, Variations } from '@repo/kit/variations';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Screen, type ScreenProps } from './screen';
import { ScreenPreview, ScreenPreviewContent } from './screen-preview.mocks';

const meta = {
  title: 'Design System/Patterns/Screen',
  component: Screen,
} satisfies Meta<typeof Screen>;

export default meta;

type Story = StoryObj<typeof meta>;

const screenVariations = [
  { label: 'Default safe-area insets', props: {} },
  { label: 'Bottom inset only', props: { edges: ['bottom'] } },
  { label: 'Insets disabled', props: { safeArea: false } },
] satisfies { label: string; props: Partial<ScreenProps> }[];

export const Overview: Story = {
  render: (args) => (
    <Variations>
      {screenVariations.map(({ label, props }) => (
        <Variation key={label} label={label}>
          <ScreenPreview>
            <Screen {...args} {...props} className="bg-content">
              <ScreenPreviewContent />
            </Screen>
          </ScreenPreview>
        </Variation>
      ))}
    </Variations>
  ),
};
