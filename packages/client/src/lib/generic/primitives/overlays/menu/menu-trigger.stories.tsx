import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Spinner } from '#primitives/status/spinner';
import { Variation, Variations as VariationList } from '../../../variations';
import type { MenuTriggerProps } from './menu-props';
import { MenuTrigger } from './menu-trigger';

const meta = {
  title: 'Design System/Primitives/Overlays/MenuTrigger',
  component: MenuTrigger,
} satisfies Meta;

export default meta;

type Story = StoryObj;

const states: { label: string; props: MenuTriggerProps }[] = [
  { label: 'Default', props: { label: 'Item', icon: 'folder' } },
  {
    label: 'Muted',
    props: { label: 'Muted', icon: 'branch', tone: 'muted' },
  },
  {
    label: 'Danger',
    props: { label: 'Danger', icon: 'private', tone: 'danger' },
  },
  { label: 'No icon', props: { label: 'No icon', tone: 'muted' } },
  {
    label: 'Disabled',
    props: { label: 'Disabled', icon: 'folder', tone: 'muted', disabled: true },
  },
  {
    label: 'Icon only',
    props: { label: 'Options', icon: 'plan-mode', iconOnly: true },
  },
  {
    label: 'With leading',
    props: {
      label: 'Label',
      leading: <Spinner accessibilityLabel="Loading" />,
    },
  },
];

export const Variations: Story = {
  name: 'MenuTrigger',
  render: () => (
    <VariationList>
      {states.map(({ label, props }) => (
        <Variation key={label} label={label}>
          <MenuTrigger {...props} />
        </Variation>
      ))}
    </VariationList>
  ),
};
