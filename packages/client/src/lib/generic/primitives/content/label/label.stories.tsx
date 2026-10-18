import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { Variation, Variations } from '../../../variations';
import { Label } from './label';
import type { LabelProps } from './label-props';

const subagents = '3 Subagents';

const meta = {
  title: 'Design System/Primitives/Content/Label',
  args: { icon: 'agent', text: subagents },
  component: Label,
} satisfies Meta<typeof Label>;

export default meta;

const samples: { label: string; props: LabelProps }[] = [
  { label: 'Session Subagents', props: { icon: 'agent', text: subagents } },
  {
    label: 'Session PR',
    props: { icon: 'pr-open', text: '#45', tone: 'success' },
  },
  { label: 'CI run', props: { icon: 'check', text: '2/5 jobs', tone: 'info' } },
  {
    label: 'CI failed',
    props: { icon: 'warning', text: 'Build failed', tone: 'danger' },
  },
  { label: 'Merged', props: { icon: 'pr-merged', text: '#46', tone: 'done' } },
  {
    label: 'Queued',
    props: { icon: 'cycle', text: 'Waiting', tone: 'warning' },
  },
  {
    label: 'Neutral',
    props: { icon: 'check', text: 'Neutral', tone: 'neutral' },
  },
  { label: 'Accent', props: { icon: 'check', text: 'Accent', tone: 'accent' } },
];

export const Overview: StoryObj<typeof meta> = {
  name: 'Label',
  render: () => (
    <Variations>
      {samples.map(({ label, props }) => (
        <Variation key={label} label={label}>
          <Label {...props} />
        </Variation>
      ))}
    </Variations>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText(subagents)).toBeVisible();
    await expect(canvas.getByText('2/5 jobs')).toBeVisible();
    await expect(canvas.getByTestId('icon-pr-open')).toBeVisible();
  },
};
