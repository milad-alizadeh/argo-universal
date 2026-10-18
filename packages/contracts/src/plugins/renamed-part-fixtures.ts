import type { WireNode } from './wire';

export const renamedPartFixtures: {
  type: string;
  props: WireNode['props'];
  legacy: WireNode['props'];
}[] = [
  {
    type: 'Switch',
    props: {
      value: true,
      onValueChange: { $event: 'onValueChange' },
      accessibilityLabel: 'Enabled',
    },
    legacy: {
      checked: true,
      onChange: { $event: 'onChange' },
      label: 'Enabled',
    },
  },
  {
    type: 'Checkbox',
    props: {
      value: false,
      onValueChange: { $event: 'onValueChange' },
      label: 'Remember',
    },
    legacy: {
      checked: false,
      onChange: { $event: 'onChange' },
      label: 'Remember',
    },
  },
  {
    type: 'Slider',
    props: {
      value: 2,
      minimumValue: 1,
      maximumValue: 10,
      step: 1,
      accessibilityLabel: 'Effort',
      valueLabel: 'Low',
      onValueChange: { $event: 'onValueChange' },
    },
    legacy: {
      value: 2,
      min: 1,
      max: 10,
      step: 1,
      label: 'Effort',
      onChange: { $event: 'onChange' },
    },
  },
  {
    type: 'SearchField',
    props: {
      label: 'Search jobs',
      value: 'build',
      onChangeText: { $event: 'onChangeText' },
    },
    legacy: {
      placeholder: 'Search jobs',
      value: 'build',
      onChangeText: { $event: 'onChangeText' },
    },
  },
  { type: 'Tooltip', props: { label: 'Save' }, legacy: { text: 'Save' } },
  {
    type: 'Toast',
    props: { title: 'Saved', message: 'All changes saved', tone: 'success' },
    legacy: {
      title: 'Saved',
      description: 'All changes saved',
      tone: 'success',
    },
  },
  {
    type: 'Sheet',
    props: {
      open: true,
      onOpenChange: { $event: 'onOpenChange' },
      label: 'Settings',
    },
    legacy: { title: 'Settings' },
  },
  {
    type: 'Button',
    props: { label: 'Save', loading: true, icon: 'check', fullWidth: true },
    legacy: { label: 'Save', disabled: true },
  },
];
