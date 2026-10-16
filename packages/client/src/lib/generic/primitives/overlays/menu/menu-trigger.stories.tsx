import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Spinner } from '#primitives/display/spinner';
import { Variation, Variations as VariationList } from '../../../variations';
import type { MenuTriggerProps } from './menu-props';
import { MenuTrigger } from './menu-trigger';

const meta = { title: 'Design System/Primitives/MenuTrigger' } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const states: { label: string; props: MenuTriggerProps }[] = [
  { label: 'Default', props: { label: 'argo-universal', icon: 'folder' } },
  {
    label: 'Muted',
    props: { label: 'New worktree', icon: 'branch', tone: 'muted' },
  },
  {
    label: 'Danger',
    props: { label: 'Full access', icon: 'private', tone: 'danger' },
  },
  { label: 'No icon', props: { label: 'Settings', tone: 'muted' } },
  {
    label: 'Disabled',
    props: { label: 'Local', icon: 'folder', tone: 'muted', disabled: true },
  },
  {
    label: 'Icon only',
    props: { label: 'Mode', icon: 'plan-mode', iconOnly: true },
  },
  {
    label: 'With leading',
    props: {
      label: 'Opus 4.5',
      leading: <Spinner accessibilityLabel="Opening the Session" />,
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
