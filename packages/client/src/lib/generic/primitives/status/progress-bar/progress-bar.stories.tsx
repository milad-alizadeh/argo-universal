import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { Variation, Variations } from '../../../variations';
import { ProgressBar } from './progress-bar';
import type { ProgressBarProps } from './progress-bar-props';

const meta = {
  title: 'Design System/Primitives/Status/ProgressBar',
  args: { value: 0.4 },
  component: ProgressBar,
} satisfies Meta<typeof ProgressBar>;

export default meta;

const samples: { label: string; props: ProgressBarProps }[] = [
  {
    label: 'Session running',
    props: {
      value: 0.4,
      tone: 'success',
      active: true,
      accessibilityLabel: 'Session plan',
    },
  },
  {
    label: 'CI waiting',
    props: {
      value: 0.75,
      tone: 'warning',
      active: true,
      accessibilityLabel: 'CI jobs',
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

const valueAttribute = 'aria-valuenow';

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
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('progressbar', { name: 'Session plan' }),
    ).toHaveAttribute(valueAttribute, '40');
    await expect(
      canvas.getByRole('progressbar', { name: 'CI jobs' }),
    ).toHaveAttribute(valueAttribute, '75');
    await expect(
      canvas.getByRole('progressbar', { name: 'Queued' }),
    ).toHaveAttribute(valueAttribute, '0');
    await expect(
      canvas.getByRole('progressbar', { name: 'Complete' }),
    ).toHaveAttribute(valueAttribute, '100');
  },
};
