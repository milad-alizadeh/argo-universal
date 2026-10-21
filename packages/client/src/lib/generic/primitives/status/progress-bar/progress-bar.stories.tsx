import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#storybook/kit-arg-types';
import { Variation, Variations } from '../../../variations';
import { ProgressBar } from './progress-bar';
import type { ProgressBarProps } from './progress-bar-props';

const meta = {
  title: 'Design System/Primitives/Status/ProgressBar',
  args: { value: 0.4 },
  component: ProgressBar,
  argTypes: kitArgTypes('ProgressBar'),
} satisfies Meta<typeof ProgressBar>;

export default meta;

const samples: { label: string; props: ProgressBarProps }[] = [
  {
    label: 'Running',
    props: {
      value: 0.4,
      tone: 'success',
      active: true,
      accessibilityLabel: 'Plan',
    },
  },
  {
    label: 'Waiting',
    props: {
      value: 0.75,
      tone: 'warning',
      active: true,
      accessibilityLabel: 'Jobs',
    },
  },
  {
    label: 'Not started',
    props: { value: 0, tone: 'muted', accessibilityLabel: 'Queued' },
  },
  {
    label: 'Complete',
    props: { value: 1, tone: 'done', accessibilityLabel: 'Complete' },
  },
  {
    label: 'Failed',
    props: { value: 0.4, tone: 'danger', accessibilityLabel: 'Failed' },
  },
  { label: 'Neutral', props: { value: 0.5, tone: 'neutral' } },
  { label: 'Accent', props: { value: 0.5, tone: 'accent' } },
  { label: 'Info', props: { value: 0.5, tone: 'info' } },
];

export const Overview: StoryObj<typeof meta> = {
  name: 'ProgressBar',
  render: () => (
    <Variations>
      {samples.map(({ label, props }) => (
        <Variation key={label} label={label}>
          <ProgressBar {...props} />
        </Variation>
      ))}
    </Variations>
  ),
};
