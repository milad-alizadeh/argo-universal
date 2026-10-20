import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Variation, Variations } from '../../../../lib/generic/variations';
import { TurnEndRow } from './turn-end';
import { endings, visibleEndings } from './turn-end.mocks';

const meta = {
  title: 'Feed/TurnEnd',
  component: TurnEndRow,
  args: { end: endings.stopped },
} satisfies Meta<typeof TurnEndRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'TurnEnd',
  render: () => (
    <Variations>
      {visibleEndings.map(({ label, end }) => (
        <Variation key={label} label={label}>
          <TurnEndRow end={end} />
        </Variation>
      ))}
    </Variations>
  ),
};
