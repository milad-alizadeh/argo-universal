import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#storybook/kit-arg-types';
import { Variation, Variations } from '../../../variations';
import { Label } from './label';
import type { LabelProps } from './label-props';

const subagents = '3 items';

const meta = {
  title: 'Design System/Primitives/Content/Label',
  args: { icon: 'agent', text: subagents },
  component: Label,
  argTypes: kitArgTypes('Label'),
} satisfies Meta<typeof Label>;

export default meta;

const samples: { label: string; props: LabelProps }[] = [
  { label: 'Count', props: { icon: 'agent', text: subagents } },
  {
    label: 'Success',
    props: { icon: 'pr-open', text: '#45', tone: 'success' },
  },
  { label: 'Info', props: { icon: 'check', text: '2/5', tone: 'info' } },
  {
    label: 'Danger',
    props: { icon: 'warning', text: 'Failed', tone: 'danger' },
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
  {
    label: 'Text only',
    props: { text: 'v1.2.0', testID: 'label-text-only' },
  },
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
};
