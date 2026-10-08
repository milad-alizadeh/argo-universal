import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import {
  liveHeaderNow,
  liveHeaderSteps,
  requestHeader,
} from '../../mocks/live-header-mock';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import { LiveHeader } from './live-header';

const meta = {
  title: 'Sessions/Feed/LiveHeader',
  component: LiveHeader,
  args: { liveHeader: requestHeader, now: liveHeaderNow },
} satisfies Meta<typeof LiveHeader>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'LiveHeader',
  render: () => (
    <Variations className="max-w-composer!">
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
