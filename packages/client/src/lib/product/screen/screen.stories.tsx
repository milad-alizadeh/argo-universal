import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Variation, Variations } from '../../generic/variations';
import { Screen, type ScreenProps } from './screen';
import { ScreenPreview, ScreenPreviewContent } from './screen-preview.mocks';

const meta = { title: 'Shared/Screen', component: Screen } satisfies Meta<
  typeof Screen
>;

export default meta;

type Story = StoryObj<typeof meta>;

const screenVariations = [
  { label: 'Default safe-area insets', props: {} },
  { label: 'Bottom inset only', props: { edges: ['bottom'] } },
  { label: 'Insets disabled', props: { safeArea: false } },
] satisfies { label: string; props: Partial<ScreenProps> }[];

export const Overview: Story = {
  name: 'Screen',
  render: (args) => (
    <Variations>
      {screenVariations.map(({ label, props }) => (
        <Variation key={label} label={label}>
          <ScreenPreview>
            <Screen {...args} {...props} className="bg-sidebar">
              <ScreenPreviewContent />
            </Screen>
          </ScreenPreview>
        </Variation>
      ))}
    </Variations>
  ),
};
