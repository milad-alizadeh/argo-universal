import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { liveHeaderNow, liveHeaderSteps } from '../../mocks/live-header-mock';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import { LiveHeader } from './LiveHeader';

const meta = {
  title: 'Sessions/Feed/LiveHeader',
  component: LiveHeader,
  args: {
    text: 'Awaiting approval',
    source: { type: 'request' },
    startedAt: liveHeaderNow - 134_000,
    now: liveHeaderNow,
  },
} satisfies Meta<typeof LiveHeader>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'LiveHeader',
  render: () => (
    <Variations className="max-w-composer!">
      {liveHeaderSteps.map(({ step, text, source, startedAt }) => (
        <Variation key={step} label={step}>
          <LiveHeader
            text={text}
            source={source}
            startedAt={startedAt}
            now={liveHeaderNow}
          />
        </Variation>
      ))}
    </Variations>
  ),
};
