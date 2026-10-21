import { Variation, Variations } from '@repo/kit/variations';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { LiveHeader } from './live-header';
import {
  liveHeaderNow,
  liveHeaderSteps,
  requestHeader,
  thoughtHeader,
} from './live-header.mocks';

const meta = {
  title: 'Feed/LiveHeader',
  component: LiveHeader,
  args: { liveHeader: requestHeader, now: liveHeaderNow },
} satisfies Meta<typeof LiveHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'LiveHeader',
  render: () => (
    <Variations className="max-w-column!">
      {liveHeaderSteps.map(({ step, liveHeader, toolCall }) => (
        <Variation key={step} label={step}>
          <LiveHeader
            liveHeader={liveHeader}
            toolCall={toolCall}
            now={liveHeaderNow}
          />
        </Variation>
      ))}
    </Variations>
  ),
};

export const Thinking: Story = {
  args: { liveHeader: thoughtHeader },
};
